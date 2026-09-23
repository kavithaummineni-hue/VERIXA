from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional

from database import get_db
from models import StudentProfile, Skill, Evidence


router = APIRouter(
    tags=["Phase 2 - Profile, Skills, Evidence"]
)


# ============================================================
# SCHEMAS
# ============================================================

class ProfileRequest(BaseModel):
    user_id: int
    college: str
    branch: str
    graduation_year: int
    bio: Optional[str] = ""
    github: Optional[str] = ""
    linkedin: Optional[str] = ""


class SkillRequest(BaseModel):
    user_id: int
    skill_name: str
    claimed_level: str
    experience_years: float = 0


class EvidenceRequest(BaseModel):
    user_id: int
    skill_id: int
    evidence_type: str
    title: str
    description: Optional[str] = ""
    link: Optional[str] = ""


# ============================================================
# PROFILE
# ============================================================

@router.post("/profile")
def create_or_update_profile(
    request: ProfileRequest,
    db: Session = Depends(get_db)
):

    profile = (
        db.query(StudentProfile)
        .filter(
            StudentProfile.user_id == request.user_id
        )
        .first()
    )

    if profile:

        profile.college = request.college
        profile.branch = request.branch
        profile.graduation_year = request.graduation_year
        profile.bio = request.bio
        profile.github = request.github
        profile.linkedin = request.linkedin

    else:

        profile = StudentProfile(
            user_id=request.user_id,
            college=request.college,
            branch=request.branch,
            graduation_year=request.graduation_year,
            bio=request.bio,
            github=request.github,
            linkedin=request.linkedin
        )

        db.add(profile)

    db.commit()
    db.refresh(profile)

    return {
        "message": "Profile saved",
        "profile": {
            "user_id": profile.user_id,
            "college": profile.college,
            "branch": profile.branch,
            "graduation_year": profile.graduation_year,
            "bio": profile.bio,
            "github": profile.github,
            "linkedin": profile.linkedin
        }
    }


@router.get("/profile/{user_id}")
def get_profile(
    user_id: int,
    db: Session = Depends(get_db)
):

    profile = (
        db.query(StudentProfile)
        .filter(
            StudentProfile.user_id == user_id
        )
        .first()
    )

    if not profile:

        raise HTTPException(
            status_code=404,
            detail="Profile not found"
        )

    return profile


# ============================================================
# SKILLS
# ============================================================

@router.post("/skills")
def add_skill(
    request: SkillRequest,
    db: Session = Depends(get_db)
):

    skill = Skill(
        user_id=request.user_id,
        skill_name=request.skill_name,
        claimed_level=request.claimed_level,
        experience_years=request.experience_years
    )

    db.add(skill)
    db.commit()
    db.refresh(skill)

    return {
        "message": "Skill added",
        "skill": {
            "id": skill.id,
            "skill_name": skill.skill_name,
            "claimed_level": skill.claimed_level,
            "experience_years": skill.experience_years
        }
    }


@router.get("/skills/{user_id}")
def get_skills(
    user_id: int,
    db: Session = Depends(get_db)
):

    return (
        db.query(Skill)
        .filter(
            Skill.user_id == user_id
        )
        .all()
    )


# ============================================================
# EVIDENCE
# ============================================================

@router.post("/evidence")
def add_evidence(
    request: EvidenceRequest,
    db: Session = Depends(get_db)
):

    skill = (
        db.query(Skill)
        .filter(
            Skill.id == request.skill_id
        )
        .first()
    )

    if not skill:

        raise HTTPException(
            status_code=404,
            detail="Skill not found. Add the skill first via /skills"
        )

    # --------------------------------------------------------
    # Validate evidence type
    # --------------------------------------------------------

    allowed_types = [
        "Project",
        "Certificate",
        "GitHub Repository",
        "Internship",
        "Practical Work",
        "Assessment"
    ]

    if request.evidence_type not in allowed_types:

        raise HTTPException(
            status_code=400,
            detail={
                "message": "Invalid evidence type",
                "allowed_types": allowed_types
            }
        )

    # --------------------------------------------------------
    # Prevent duplicate evidence
    # --------------------------------------------------------

    existing = (
        db.query(Evidence)
        .filter(
            Evidence.user_id == request.user_id,
            Evidence.skill_id == request.skill_id,
            Evidence.title == request.title
        )
        .first()
    )

    if existing:

        raise HTTPException(
            status_code=409,
            detail="Duplicate evidence already exists"
        )

    # --------------------------------------------------------
    # IMPORTANT:
    # We DO NOT accept a score from the user.
    #
    # The verification/scoring system will calculate
    # evidence scores later.
    # --------------------------------------------------------

    evidence = Evidence(
        user_id=request.user_id,
        skill_id=request.skill_id,
        evidence_type=request.evidence_type,
        title=request.title,
        description=request.description,
        link=request.link
    )

    db.add(evidence)
    db.commit()
    db.refresh(evidence)

    return {
        "message": "Evidence submitted for verification",
        "evidence_id": evidence.id,
        "verification_status": "pending"
    }


@router.get("/evidence/{user_id}")
def get_evidence(
    user_id: int,
    db: Session = Depends(get_db)
):

    return (
        db.query(Evidence)
        .filter(
            Evidence.user_id == user_id
        )
        .all()
    )