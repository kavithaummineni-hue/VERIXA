from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Dict, Optional

from database import get_db
from models import Company, Job, JobRequirement, User
from scoring import compute_verified_score

router = APIRouter(tags=["Phase 4 - Company, Jobs & Matching"])

# ---------- SCHEMAS ----------
class CompanyRequest(BaseModel):
    user_id: int
    company_name: str
    industry: Optional[str] = ""
    location: Optional[str] = ""
    website: Optional[str] = ""
    description: Optional[str] = ""


class JobRequest(BaseModel):
    company_id: int
    title: str
    description: Optional[str] = ""
    required_skills: Dict[str, float]  # e.g. {"Python": 70, "SQL": 60}


# ---------- COMPANY ----------

@router.post("/companies")
def create_company(request: CompanyRequest, db: Session = Depends(get_db)):
    company = Company(**request.dict())
    db.add(company)
    db.commit()
    db.refresh(company)
    return {"message": "Company created", "company_id": company.id}


# ---------- JOB ----------

@router.post("/jobs")
def create_job(request: JobRequest, db: Session = Depends(get_db)):
    company = db.query(Company).filter(Company.id == request.company_id).first()
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")

    job = Job(company_id=request.company_id, title=request.title, description=request.description)
    db.add(job)
    db.commit()
    db.refresh(job)

    for skill_name, required_score in request.required_skills.items():
        db.add(JobRequirement(job_id=job.id, skill_name=skill_name, required_score=required_score))
    db.commit()

    return {"message": "Job created", "job_id": job.id}


@router.get("/jobs")
def list_jobs(db: Session = Depends(get_db)):
    return db.query(Job).all()


# ---------- MATCHING LOGIC (shared) ----------

def calculate_match(db: Session, user_id: int, job: Job):
    requirements = db.query(JobRequirement).filter(JobRequirement.job_id == job.id).all()
    if not requirements:
        return {"match_score": 0, "breakdown": []}

    breakdown = []
    ratio_sum = 0

    for req in requirements:
        result = compute_verified_score(db, user_id, req.skill_name)
        verified = result["verified_score"]
        ratio = min(100, (verified / req.required_score) * 100) if req.required_score > 0 else 100
        ratio_sum += ratio

        breakdown.append({
            "skill_name": req.skill_name,
            "required_score": req.required_score,
            "verified_score": verified,
            "meets_requirement": verified >= req.required_score,
        })

    match_score = round(ratio_sum / len(requirements), 2)
    return {"match_score": match_score, "breakdown": breakdown}


# ---------- EXPLAINABLE MATCH FOR ONE STUDENT ----------

@router.get("/jobs/{job_id}/match/{user_id}")
def match_student_to_job(job_id: int, user_id: int, db: Session = Depends(get_db)):
    job = db.query(Job).filter(Job.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    result = calculate_match(db, user_id, job)
    return {
        "job_id": job_id,
        "job_title": job.title,
        "user_id": user_id,
        "match_score": result["match_score"],
        "explanation": result["breakdown"],
    }


# ---------- REVERSE RECRUITMENT: RANK ALL STUDENTS FOR A JOB ----------

@router.get("/jobs/{job_id}/candidates")
def rank_candidates(job_id: int, db: Session = Depends(get_db)):
    job = db.query(Job).filter(Job.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    students = db.query(User).filter(User.role == "student").all()

    ranked = []
    for student in students:
        result = calculate_match(db, student.id, job)
        ranked.append({
            "user_id": student.id,
            "name": student.name,
            "match_score": result["match_score"],
        })

    ranked.sort(key=lambda x: x["match_score"], reverse=True)
    return {"job_id": job_id, "job_title": job.title, "ranked_candidates": ranked}
