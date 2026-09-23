from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Dict

from database import get_db
from models import PracticalChallenge, Skill
from scoring import compute_verified_score, gap_label

router = APIRouter(tags=["Phase 3 - Verification & Skill Gap"])


# ---------- SCHEMAS ----------

class PracticalRequest(BaseModel):
    user_id: int
    skill_name: str
    title: str
    score: float  # 0-100


class SkillGapRequest(BaseModel):
    user_id: int
    required_skills: Dict[str, float]


# ---------- PRACTICAL CHALLENGE ----------

@router.post("/practical-challenges")
def submit_practical_challenge(
    request: PracticalRequest,
    db: Session = Depends(get_db)
):
    # Keep practical challenge scoring separate.
    # The score should eventually come from server-side evaluation.
    if request.score < 0 or request.score > 100:
        return {
            "message": "Invalid score. Score must be between 0 and 100."
        }

    record = PracticalChallenge(
        user_id=request.user_id,
        skill_name=request.skill_name,
        title=request.title,
        score=request.score
    )

    db.add(record)
    db.commit()
    db.refresh(record)

    return {
        "message": "Practical challenge recorded",
        "challenge_id": record.id,
        "score": record.score
    }


# ---------- VERIFIED SCORE ----------

@router.get("/verified-score/{user_id}/{skill_name}")
def verified_score(
    user_id: int,
    skill_name: str,
    db: Session = Depends(get_db)
):
    result = compute_verified_score(
        db,
        user_id,
        skill_name
    )

    claimed = db.query(Skill).filter(
        Skill.user_id == user_id,
        Skill.skill_name == skill_name
    ).first()

    return {
        "skill_name": skill_name,
        "claimed_level": (
            claimed.claimed_level
            if claimed
            else "Not claimed"
        ),
        "verified_level": result["verified_level"],
        "verified_score": result["verified_score"],
        "components_used": result["components_used"],
    }


# ---------- SKILL GAP ANALYSIS ----------

@router.post("/skill-gap")
def skill_gap(
    request: SkillGapRequest,
    db: Session = Depends(get_db)
):
    breakdown = []

    for skill_name, required_score in request.required_skills.items():

        result = compute_verified_score(
            db,
            request.user_id,
            skill_name
        )

        verified = result["verified_score"]

        breakdown.append({
            "skill_name": skill_name,
            "required_score": required_score,
            "verified_score": verified,
            "meets_requirement": verified >= required_score,
            "gap": gap_label(
                required_score,
                verified
            ),
        })

    return {
        "user_id": request.user_id,
        "skill_gap": breakdown
    }


# ---------- LEARNING ROADMAP ----------

@router.post("/learning-roadmap")
def learning_roadmap(
    request: SkillGapRequest,
    db: Session = Depends(get_db)
):
    steps = []

    for skill_name, required_score in request.required_skills.items():

        result = compute_verified_score(
            db,
            request.user_id,
            skill_name
        )

        verified = result["verified_score"]

        gap = gap_label(
            required_score,
            verified
        )

        if gap in ("High", "Medium"):

            steps.append({
                "skill_name": skill_name,
                "current_score": verified,
                "target_score": required_score,
                "gap": gap,
                "recommended_actions": [
                    f"Learn / revise {skill_name} fundamentals",
                    f"Build a small project using {skill_name}",
                    f"Retake the {skill_name} assessment to re-verify",
                ],
            })

    return {
        "user_id": request.user_id,
        "roadmap": steps,
        "message": (
            "Roadmap generated"
            if steps
            else
            "No major gaps found - all required skills are met"
        ),
    }