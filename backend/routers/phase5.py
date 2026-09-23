from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database import get_db
from models import User, Skill, Evidence, Assessment, Job, JobRequirement
from scoring import compute_verified_score, latest_verification_date, freshness_status
from routers.phase4 import calculate_match

router = APIRouter(tags=["Phase 5 - Dashboards, Passport & Assistant"])


# ---------- STUDENT DASHBOARD ----------

@router.get("/dashboard/student/{user_id}")
def student_dashboard(user_id: int, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    skills = db.query(Skill).filter(Skill.user_id == user_id).all()

    skill_summary = []
    total = 0
    for s in skills:
        result = compute_verified_score(db, user_id, s.skill_name)
        skill_summary.append({
            "skill_name": s.skill_name,
            "claimed_level": s.claimed_level,
            "verified_score": result["verified_score"],
            "verified_level": result["verified_level"],
        })
        total += result["verified_score"]

    overall_score = round(total / len(skill_summary), 2) if skill_summary else 0

    jobs = db.query(Job).all()
    job_matches = []
    for job in jobs:
        result = calculate_match(db, user_id, job)
        job_matches.append({"job_id": job.id, "job_title": job.title, "match_score": result["match_score"]})
    job_matches.sort(key=lambda x: x["match_score"], reverse=True)

    return {
        "student_name": user.name,
        "overall_verified_skill_score": overall_score,
        "skills": skill_summary,
        "job_matches": job_matches,
    }


# ---------- DIGITAL SKILL PASSPORT ----------

@router.get("/passport/{user_id}")
def skill_passport(user_id: int, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    skills = db.query(Skill).filter(Skill.user_id == user_id).all()

    passport_entries = []
    for s in skills:
        result = compute_verified_score(db, user_id, s.skill_name)
        last_date = latest_verification_date(db, user_id, s.skill_name)
        evidence_items = db.query(Evidence).filter(Evidence.skill_id == s.id).all()

        passport_entries.append({
            "skill_name": s.skill_name,
            "claimed_level": s.claimed_level,
            "verified_level": result["verified_level"],
            "verified_score": result["verified_score"],
            "evidence_count": len(evidence_items),
            "last_verified_on": last_date.strftime("%Y-%m-%d") if last_date else "Not verified yet",
            "freshness_status": freshness_status(last_date),
        })

    return {
        "student_name": user.name,
        "passport_title": "VERIXA SKILL PASSPORT",
        "skills": passport_entries,
    }


# ---------- COLLEGE DASHBOARD ----------

@router.get("/dashboard/college")
def college_dashboard(db: Session = Depends(get_db)):
    students = db.query(User).filter(User.role == "student").all()
    total_students = len(students)

    skill_totals = {}  # skill_name -> [sum, count]
    for student in students:
        student_skills = db.query(Skill).filter(Skill.user_id == student.id).all()
        for s in student_skills:
            result = compute_verified_score(db, student.id, s.skill_name)
            if s.skill_name not in skill_totals:
                skill_totals[s.skill_name] = [0, 0]
            skill_totals[s.skill_name][0] += result["verified_score"]
            skill_totals[s.skill_name][1] += 1

    top_skills = [
        {"skill_name": name, "average_verified_score": round(total / count, 2)}
        for name, (total, count) in skill_totals.items()
    ]
    top_skills.sort(key=lambda x: x["average_verified_score"], reverse=True)

    return {
        "total_students": total_students,
        "top_verified_skills": top_skills,
    }


# ---------- AI CAREER ASSISTANT (rule-based on verified data) ----------

@router.get("/career-assistant/{user_id}/{job_id}")
def career_assistant(user_id: int, job_id: int, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    job = db.query(Job).filter(Job.id == job_id).first()
    if not user or not job:
        raise HTTPException(status_code=404, detail="User or job not found")

    requirements = db.query(JobRequirement).filter(JobRequirement.job_id == job_id).all()

    missing = []
    for req in requirements:
        result = compute_verified_score(db, user_id, req.skill_name)
        if result["verified_score"] < req.required_score:
            missing.append(req.skill_name)

    if not missing:
        advice = f"Your verified skills already meet the requirements for {job.title}. You're ready to apply!"
    else:
        skills_text = ", ".join(missing)
        advice = (
            f"To improve your match for {job.title}, focus on: {skills_text}. "
            f"Take an assessment and a practical challenge in each, then re-verify."
        )

    return {
        "student_name": user.name,
        "target_job": job.title,
        "missing_or_weak_skills": missing,
        "advice": advice,
    }
