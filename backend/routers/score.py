from datetime import datetime
from typing import Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database import get_db
from models import (
    Evidence,
    Assessment,
    AssessmentResult,
    ResumeAnalysis,
    CertificateVerificationRecord,
    StudentProject,
    OverallCareerScore
)


router = APIRouter(prefix='/score', tags=['Career Score & Readiness'])


def calculate_career_readiness_data(user_id: int, db: Session) -> Dict[str, Any]:
    """
    EXACT VERIXA Weighting:
      Assessment   = 70%
      Resume       = 10%
      Certificates = 10%
      Projects     = 10%

      Formula:
      Overall Score = (Assessment Score x 0.70) + (Resume Score x 0.10) + (Certificate Score x 0.10) + (Project Score x 0.10)

      Assessment has the highest weight because it directly measures the student's knowledge.
      If student has not added any project, Project Score = 0 (0% contribution), reducing overall score accordingly.
    """
    # 1. Assessment Score (70%)
    latest_diag = db.query(AssessmentResult).filter(AssessmentResult.user_id == user_id).order_by(AssessmentResult.id.desc()).first()
    if latest_diag and (latest_diag.score is not None or latest_diag.percentage is not None):
        assessment_score = round(latest_diag.score if latest_diag.score is not None else latest_diag.percentage, 1)
        has_assessment = True
        assessments_count = latest_diag.total_questions or 1
    else:
        assessments = db.query(Assessment).filter(Assessment.user_id == user_id).all()
        unique_skill_scores = {}
        for a in assessments:
            skill_name = (a.skill_name or '').strip().lower()
            if skill_name:
                unique_skill_scores[skill_name] = a.score

        has_assessment = len(unique_skill_scores) > 0
        assessment_score = round(sum(unique_skill_scores.values()) / len(unique_skill_scores), 1) if has_assessment else None
        assessments_count = len(unique_skill_scores)

    # 2. Resume Score (10%) - Uses best valid analyzed resume score without double counting
    resume_records = db.query(ResumeAnalysis).filter(ResumeAnalysis.user_id == user_id).all()
    valid_scores = [r.resume_score for r in resume_records if r.resume_score is not None]
    has_resume = len(valid_scores) > 0
    resume_score = round(max(valid_scores), 1) if has_resume else None
    resume = db.query(ResumeAnalysis).filter(ResumeAnalysis.user_id == user_id).order_by(ResumeAnalysis.id.desc()).first()

    # 3. Certificate Score (10%)
    certs = db.query(CertificateVerificationRecord).filter(CertificateVerificationRecord.user_id == user_id).all()
    has_certs = len(certs) > 0
    cert_score = round(sum(c.score for c in certs) / len(certs), 1) if has_certs else None
    cert_count = len(certs)

    # 4. Project Score (10%)
    projects = db.query(StudentProject).filter(StudentProject.user_id == user_id).all()
    has_projects = len(projects) > 0
    project_score = round(sum(p.project_score for p in projects) / len(projects), 1) if has_projects else 0.0
    project_count = len(projects)

    # Missing components tracking
    missing = []
    if not has_assessment:
        missing.append("Diagnostic Skill Assessment (70%)")
    if not has_resume:
        missing.append("Resume Upload & Analysis (10%)")
    if not has_certs:
        missing.append("Certificates Upload (10%)")
    if not has_projects:
        missing.append("Practical Projects (10%)")

    is_complete = (len(missing) == 0)

    # Calculate weighted contributions
    assessment_val = assessment_score if assessment_score is not None else 0.0
    resume_val = resume_score if resume_score is not None else 0.0
    cert_val = cert_score if cert_score is not None else 0.0
    project_val = project_score if project_score is not None else 0.0

    contrib_assessment = round(assessment_val * 0.70, 1)
    contrib_resume = round(resume_val * 0.10, 1)
    contrib_certs = round(cert_val * 0.10, 1)
    contrib_projects = round(project_val * 0.10, 1)

    calculated_overall = round(contrib_assessment + contrib_resume + contrib_certs + contrib_projects, 1)

    if calculated_overall >= 85:
        status = "Expert Ready"
    elif calculated_overall >= 70:
        status = "Profile Verified"
    elif calculated_overall >= 45:
        status = "Partially Verified"
    elif calculated_overall > 0:
        status = "In Progress"
    else:
        status = "Incomplete"

    if is_complete:
        message = f"Overall VERIXA score verified successfully: {calculated_overall}/100."
    else:
        missing_str = ", ".join(missing)
        message = f"Score calculated from available evidence ({calculated_overall}/100). Pending: {missing_str}."

    # Save or update OverallCareerScore record
    overall_record = db.query(OverallCareerScore).filter(OverallCareerScore.user_id == user_id).order_by(OverallCareerScore.id.desc()).first()
    if not overall_record:
        overall_record = OverallCareerScore(
            user_id=user_id,
            assessment_score=assessment_score,
            skill_score=assessment_score,
            resume_score=resume_score,
            certificate_score=cert_score,
            project_score=project_score,
            overall_score=calculated_overall,
            is_complete=1 if is_complete else 0,
            status=status,
            message=message,
            calculated_at=datetime.utcnow()
        )
        db.add(overall_record)
    else:
        overall_record.assessment_score = assessment_score
        overall_record.skill_score = assessment_score
        overall_record.resume_score = resume_score
        overall_record.certificate_score = cert_score
        overall_record.project_score = project_score
        overall_record.overall_score = calculated_overall
        overall_record.is_complete = 1 if is_complete else 0
        overall_record.status = status
        overall_record.message = message
        overall_record.calculated_at = datetime.utcnow()

    db.commit()

    return {
        "user_id": user_id,
        "is_complete": is_complete,
        "status": status,
        "overall_score": calculated_overall,
        "message": message,
        "formula": "Overall Score = (Assessment Score x 70%) + (Resume Score x 10%) + (Certificate Score x 10%) + (Project Score x 10%)",
        "breakdown": {
            "assessment": {
                "name": "Skill Assessment",
                "weight": "70%",
                "weight_factor": 0.70,
                "status": "Completed" if has_assessment else "Not Completed",
                "completed": has_assessment,
                "score": assessment_score,
                "contribution": contrib_assessment,
                "details": f"{assessments_count} questions/skills assessed"
            },
            "resume": {
                "name": "Resume Analysis",
                "weight": "10%",
                "weight_factor": 0.10,
                "status": "Uploaded & Analyzed" if has_resume else "Not Uploaded",
                "completed": has_resume,
                "score": resume_score,
                "contribution": contrib_resume,
                "filename": resume.filename if resume else None
            },
            "certificates": {
                "name": "Certificates",
                "weight": "10%",
                "weight_factor": 0.10,
                "status": ("Uploaded & Verified" if any(c.verification_status == "VERIFIED" for c in certs) else "Uploaded") if has_certs else "No Certificates Uploaded",
                "completed": has_certs,
                "score": cert_score,
                "contribution": contrib_certs,
                "certificate_count": cert_count
            },
            "projects": {
                "name": "Practical Projects",
                "weight": "10%",
                "weight_factor": 0.10,
                "status": "Added & Scored" if has_projects else "No Projects Added (0%)",
                "completed": has_projects,
                "score": project_score,
                "contribution": contrib_projects,
                "project_count": project_count
            }
        },
        "missing_components": missing
    }


@router.get('/career-readiness/{user_id}')
def get_career_readiness(user_id: int, db: Session = Depends(get_db)):
    """
    Get full career readiness score with 70/10/10/10 breakdown.
    """
    return calculate_career_readiness_data(user_id, db)


@router.get('/final/{user_id}')
def final_score(user_id: int, db: Session = Depends(get_db)):
    """
    Composite score endpoint used across dashboard and verification pages.
    """
    data = calculate_career_readiness_data(user_id, db)
    b = data["breakdown"]

    return {
        'final_score': data["overall_score"],
        'overall_score': data["overall_score"],
        'status': data['status'],
        'is_complete': data['is_complete'],
        'message': data['message'],
        'formula': data['formula'],
        'breakdown': {
            'assessment': b["assessment"]["contribution"],
            'resume': b["resume"]["contribution"],
            'certificates': b["certificates"]["contribution"],
            'projects': b["projects"]["contribution"]
        },
        'raw': {
            'assessment': b["assessment"]["score"],
            'resume': b["resume"]["score"],
            'certificates': b["certificates"]["score"],
            'projects': b["projects"]["score"]
        },
        'career_readiness': data
    }


