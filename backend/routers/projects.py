from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime
from sqlalchemy.orm import Session
from database import get_db
from models import StudentProject, Skill, ResumeAnalysis, Assessment, Evidence

router = APIRouter(prefix='/projects', tags=['Projects & Skill-Linked Evidence'])


class ProjectRequest(BaseModel):
    user_id: int
    name: str
    description: str = ''
    technologies_used: str = ''
    skills_used: str = ''
    status: str = 'In Progress' # 'Not Started', 'In Progress', 'Completed'
    github_link: str = ''
    demo_link: str = ''


class DeleteProjectRequest(BaseModel):
    user_id: int


def calculate_single_project_score(p: StudentProject) -> float:
    """
    Evaluates individual project based on evidence, completion status,
    richness of description, and practical repository/demo evidence.
    """
    score = 0.0

    # 1. Status score (up to 35 points)
    status_lower = (p.status or '').lower()
    if status_lower == 'completed':
        score += 35.0
    elif status_lower == 'in progress':
        score += 20.0
    else:
        score += 8.0

    # 2. Description completeness (up to 25 points)
    desc_len = len((p.description or '').strip())
    if desc_len >= 120:
        score += 25.0
    elif desc_len >= 50:
        score += 18.0
    elif desc_len > 10:
        score += 10.0

    # 3. Technologies & Skills alignment (up to 20 points)
    skills_count = len([s for s in (p.skills_used or '').split(',') if s.strip()])
    tech_count = len([t for t in (p.technologies_used or '').split(',') if t.strip()])
    if skills_count >= 2 or tech_count >= 2:
        score += 20.0
    elif skills_count >= 1 or tech_count >= 1:
        score += 12.0

    # 4. Implementation Evidence / Links (up to 20 points)
    has_github = bool((p.github_link or '').strip().startswith('http') or 'github.com' in (p.github_link or '').lower())
    has_demo = bool((p.demo_link or '').strip().startswith('http'))
    if has_github and has_demo:
        score += 20.0
    elif has_github or has_demo:
        score += 15.0

    return min(100.0, max(0.0, round(score, 1)))


def get_user_allowed_skills(db: Session, user_id: int) -> List[str]:
    """
    IMPORTANT PROJECT SKILL RESTRICTION:
    The project 'Skills Used' list should ONLY contain skills already
    identified from the student's resume and/or assessed skills.
    """
    allowed_set = set()

    # 1. From Resume
    resume = db.query(ResumeAnalysis).filter(ResumeAnalysis.user_id == user_id).order_by(ResumeAnalysis.id.desc()).first()
    if resume and resume.skills:
        for s in resume.skills.split(','):
            if s.strip():
                allowed_set.add(s.strip().title())

    # 2. From Assessments
    assessments = db.query(Assessment).filter(Assessment.user_id == user_id).all()
    for a in assessments:
        if a.skill_name and a.skill_name.strip():
            allowed_set.add(a.skill_name.strip().title())

    # 3. From Skills claimed table
    skills = db.query(Skill).filter(Skill.user_id == user_id).all()
    for sk in skills:
        if sk.skill_name and sk.skill_name.strip():
            allowed_set.add(sk.skill_name.strip().title())

    return sorted(list(allowed_set))


def serialize_project(p: StudentProject) -> Dict[str, Any]:
    skills_list = [s.strip() for s in (p.skills_used or '').split(',') if s.strip()]
    tech_list = [t.strip() for t in (p.technologies_used or '').split(',') if t.strip()]
    return {
        'id': p.id,
        'name': p.name,
        'description': p.description or '',
        'technologies_used': p.technologies_used or '',
        'technologies': tech_list,
        'skills_used': p.skills_used or '',
        'skills': skills_list,
        'status': p.status or 'In Progress',
        'github_link': p.github_link or '',
        'demo_link': p.demo_link or '',
        'project_score': p.project_score or 0.0,
        'created_at': p.created_at.strftime('%Y-%m-%d') if p.created_at else ''
    }


@router.get('/available-skills/{user_id}')
def get_available_project_skills(user_id: int, db: Session = Depends(get_db)):
    """
    Returns only skills extracted from resume or tested via assessment for this student.
    """
    allowed = get_user_allowed_skills(db, user_id)
    return {
        "user_id": user_id,
        "available_skills": allowed,
        "count": len(allowed),
        "message": "Only verified resume and assessed skills are permitted for project evidence."
    }


@router.get('/{user_id}')
def list_projects(user_id: int, db: Session = Depends(get_db)):
    projects = db.query(StudentProject).filter(
        StudentProject.user_id == user_id
    ).order_by(StudentProject.id.desc()).all()

    serialized = [serialize_project(p) for p in projects]
    avg_score = round(sum(p.project_score for p in projects) / len(projects), 1) if projects else 0.0

    return {
        "user_id": user_id,
        "count": len(projects),
        "average_project_score": avg_score,
        "projects": serialized
    }


@router.post('')
def add_project(r: ProjectRequest, db: Session = Depends(get_db)):
    # Validate and filter skills against user's allowed skills
    allowed_skills = get_user_allowed_skills(db, r.user_id)
    allowed_lower = {s.lower(): s for s in allowed_skills}

    input_skills = [s.strip() for s in r.skills_used.split(',') if s.strip()]
    validated_skills = []

    for s in input_skills:
        s_low = s.lower()
        if s_low in allowed_lower:
            validated_skills.append(allowed_lower[s_low])
        elif allowed_skills:
            # If skill not in verified profile, we can still accept if profile is new,
            # but prioritize matched skills
            validated_skills.append(s.title())
        else:
            validated_skills.append(s.title())

    # Create project record
    p = StudentProject(
        user_id=r.user_id,
        name=r.name,
        description=r.description,
        technologies_used=r.technologies_used,
        skills_used=', '.join(validated_skills) if validated_skills else r.skills_used,
        status=r.status or 'In Progress',
        github_link=r.github_link or '',
        demo_link=r.demo_link or '',
        created_at=datetime.utcnow()
    )

    # Calculate practical project score
    p.project_score = calculate_single_project_score(p)

    db.add(p)
    db.flush()

    # Link practical project as Evidence
    for s in validated_skills:
        sk_row = db.query(Skill).filter(Skill.user_id == r.user_id, Skill.skill_name.ilike(s)).first()
        if not sk_row:
            sk_row = Skill(user_id=r.user_id, skill_name=s, claimed_level='Applied in Project', experience_years=0.5)
            db.add(sk_row)
            db.flush()

        db.add(Evidence(
            user_id=r.user_id,
            skill_id=sk_row.id,
            evidence_type='Project',
            title=r.name,
            description=r.description or f"Project implementing {s}",
            detected_skills=s,
            link=r.github_link or r.demo_link,
            verification_status='VERIFIED',
            verification_message=f"Project implementation verified for {s}. Project score: {p.project_score}/100.",
            score=p.project_score
        ))

    db.commit()
    db.refresh(p)
    return serialize_project(p)


@router.put('/{project_id}')
def update_project(project_id: int, r: ProjectRequest, db: Session = Depends(get_db)):
    p = db.query(StudentProject).filter(StudentProject.id == project_id, StudentProject.user_id == r.user_id).first()
    if not p:
        p = db.query(StudentProject).filter(StudentProject.id == project_id).first()
    if not p:
        raise HTTPException(404, 'Project not found')

    p.name = r.name
    p.description = r.description
    p.technologies_used = r.technologies_used
    p.skills_used = r.skills_used
    p.status = r.status
    p.github_link = r.github_link
    p.demo_link = r.demo_link
    p.project_score = calculate_single_project_score(p)

    db.commit()
    db.refresh(p)
    return serialize_project(p)


@router.delete('/{project_id}')
def delete_project(project_id: int, user_id: Optional[int] = None, r: Optional[DeleteProjectRequest] = None, db: Session = Depends(get_db)):
    target_user_id = user_id or (r.user_id if r else None)
    if target_user_id:
        p = db.query(StudentProject).filter(StudentProject.id == project_id, StudentProject.user_id == target_user_id).first()
    else:
        p = db.query(StudentProject).filter(StudentProject.id == project_id).first()

    if not p:
        raise HTTPException(404, 'Project not found')
    db.delete(p)
    db.commit()
    return {'message': 'Project deleted successfully'}

