"""
VERIXA - Skill Verification Intelligence

Core principle:

    CLAIMED SKILL != VERIFIED SKILL

A skill is verified using the evidence actually available for the
student:

    Resume / Profile Claims
            +
    Certificates / Evidence
            +
    Assessments
            +
    Practical Challenges
            +
    Cross-verification

IMPORTANT:
Uploading a file alone does NOT automatically give skill points.

Evidence should receive a score only when it has been analysed and
marked as valid by the evidence-processing system.
"""

from datetime import datetime, timedelta
from sqlalchemy.orm import Session

from models import Skill, Evidence, Assessment, PracticalChallenge


# ---------------------------------------------------------
# SKILL LEVEL
# ---------------------------------------------------------

def level_from_score(score: float) -> str:
    """
    Convert verified percentage into a skill level.
    """

    if score >= 85:
        return "Expert"

    if score >= 70:
        return "Advanced"

    if score >= 40:
        return "Intermediate"

    if score > 0:
        return "Beginner"

    return "Not Verified"


# ---------------------------------------------------------
# SAFE SCORE
# ---------------------------------------------------------

def safe_score(value) -> float:
    """
    Convert a database score safely into a number between 0 and 100.
    """

    try:
        score = float(value)

        if score < 0:
            return 0.0

        if score > 100:
            return 100.0

        return score

    except (TypeError, ValueError):
        return 0.0


# ---------------------------------------------------------
# EVIDENCE VALIDITY
# ---------------------------------------------------------

def evidence_is_valid(evidence) -> bool:
    """
    Determine whether evidence should participate in verification.

    VERIXA rule:

        Uploaded != Verified

    If the Evidence model contains a validity/verification field,
    use it. Otherwise, fall back to the evidence score.

    This keeps the function compatible with the current database
    while allowing the future document-analysis module to mark
    evidence as valid/invalid.
    """

    # Possible verification fields that may exist in future versions
    for field_name in [
        "is_verified",
        "verified",
        "is_valid",
        "valid",
    ]:
        if hasattr(evidence, field_name):
            value = getattr(evidence, field_name)

            if value is False:
                return False

            if value is True:
                return True

    # If there is no verification flag, only usable scored evidence
    # is considered.
    return safe_score(getattr(evidence, "score", 0)) > 0


# ---------------------------------------------------------
# EVIDENCE SCORE
# ---------------------------------------------------------

def get_evidence_score(evidence) -> float:
    """
    Return the score of valid evidence.

    Invalid or mismatched evidence contributes ZERO.
    """

    if not evidence_is_valid(evidence):
        return 0.0

    return safe_score(getattr(evidence, "score", 0))


# ---------------------------------------------------------
# VERIFIED SCORE
# ---------------------------------------------------------

def compute_verified_score(
    db: Session,
    user_id: int,
    skill_name: str
) -> dict:

    skill_name_normalized = skill_name.strip().lower()

    assessment_scores = []
    practical_scores = []
    evidence_scores = []

    # =====================================================
    # 1. ASSESSMENTS
    # =====================================================

    assessments = db.query(Assessment).filter(
        Assessment.user_id == user_id
    ).all()

    for assessment in assessments:

        name = str(
            getattr(assessment, "skill_name", "")
        ).strip().lower()

        if name == skill_name_normalized:

            score = safe_score(
                getattr(assessment, "score", 0)
            )

            if score > 0:
                assessment_scores.append(score)

    # =====================================================
    # 2. PRACTICAL CHALLENGES
    # =====================================================

    practicals = db.query(PracticalChallenge).filter(
        PracticalChallenge.user_id == user_id
    ).all()

    for practical in practicals:

        name = str(
            getattr(practical, "skill_name", "")
        ).strip().lower()

        if name == skill_name_normalized:

            score = safe_score(
                getattr(practical, "score", 0)
            )

            if score > 0:
                practical_scores.append(score)

    # =====================================================
    # 3. DOCUMENT / PROJECT / CERTIFICATE EVIDENCE
    # =====================================================

    skill_rows = db.query(Skill).filter(
        Skill.user_id == user_id
    ).all()

    matching_skill = None

    for skill in skill_rows:

        name = str(
            getattr(skill, "skill_name", "")
        ).strip().lower()

        if name == skill_name_normalized:
            matching_skill = skill
            break

    if matching_skill:

        evidences = db.query(Evidence).filter(
            Evidence.skill_id == matching_skill.id
        ).all()

        for evidence in evidences:

            score = get_evidence_score(evidence)

            if score > 0:
                evidence_scores.append(score)

    # =====================================================
    # AVERAGES
    # =====================================================

    assessment_average = (
        round(sum(assessment_scores) / len(assessment_scores), 2)
        if assessment_scores
        else None
    )

    practical_average = (
        round(sum(practical_scores) / len(practical_scores), 2)
        if practical_scores
        else None
    )

    evidence_average = (
        round(sum(evidence_scores) / len(evidence_scores), 2)
        if evidence_scores
        else None
    )

    # =====================================================
    # NO REAL VERIFICATION DATA
    # =====================================================

    if (
        assessment_average is None
        and practical_average is None
        and evidence_average is None
    ):

        return {
            "skill_name": skill_name,
            "verified_score": 0,
            "verified_level": "Not Verified",
            "components_used": 0,
            "assessment_score": None,
            "practical_score": None,
            "evidence_score": None,
            "confidence": "None",
            "verification_status": "No supporting evidence",
            "message": (
                "This skill is only claimed or has not yet "
                "been supported by verified evidence."
            ),
        }

    # =====================================================
    # COMPONENT WEIGHTS
    # =====================================================
    #
    # Practical ability is strongest.
    # Assessment demonstrates knowledge.
    # Evidence demonstrates real-world work.
    #
    # Missing components are NOT treated as zero.
    #

    weighted_total = 0.0
    total_weight = 0.0

    if assessment_average is not None:

        weighted_total += assessment_average * 0.30
        total_weight += 0.30

    if practical_average is not None:

        weighted_total += practical_average * 0.40
        total_weight += 0.40

    if evidence_average is not None:

        weighted_total += evidence_average * 0.30
        total_weight += 0.30

    verified_score = round(
        weighted_total / total_weight,
        2
    )

    # =====================================================
    # CONFIDENCE
    # =====================================================

    components_used = sum([
        assessment_average is not None,
        practical_average is not None,
        evidence_average is not None,
    ])

    if components_used >= 3:
        confidence = "High"

    elif components_used == 2:
        confidence = "Medium"

    else:
        confidence = "Low"

    # =====================================================
    # CONSISTENCY CHECK
    # =====================================================

    available_scores = [
        score
        for score in [
            assessment_average,
            practical_average,
            evidence_average
        ]
        if score is not None
    ]

    consistency_warning = None

    if len(available_scores) >= 2:

        highest = max(available_scores)
        lowest = min(available_scores)

        difference = highest - lowest

        if difference >= 40:

            consistency_warning = (
                "Large difference between submitted evidence "
                "and demonstrated skill level."
            )

            confidence = "Low"

        elif difference >= 25:

            consistency_warning = (
                "Some differences were found between the "
                "available verification sources."
            )

    # =====================================================
    # VERIFICATION STATUS
    # =====================================================

    if verified_score >= 85:

        verification_status = "Strongly Verified"

    elif verified_score >= 70:

        verification_status = "Verified"

    elif verified_score >= 40:

        verification_status = "Partially Verified"

    else:

        verification_status = "Needs Improvement"

    # =====================================================
    # MESSAGE
    # =====================================================

    if consistency_warning:

        message = consistency_warning

    elif components_used == 1:

        message = (
            "Skill score is based on limited verification data. "
            "Add more evidence, assessments or practical work."
        )

    else:

        message = (
            "Skill score was calculated using the available "
            "verified evidence."
        )

    # =====================================================
    # FINAL RESULT
    # =====================================================

    return {
        "skill_name": skill_name,
        "verified_score": verified_score,
        "verified_level": level_from_score(verified_score),

        "components_used": components_used,

        "assessment_score": assessment_average,
        "practical_score": practical_average,
        "evidence_score": evidence_average,

        "confidence": confidence,
        "verification_status": verification_status,

        "consistency_warning": consistency_warning,

        "message": message,
    }


# ---------------------------------------------------------
# LATEST VERIFICATION DATE
# ---------------------------------------------------------

def latest_verification_date(
    db: Session,
    user_id: int,
    skill_name: str
):

    dates = []

    skill_name_normalized = skill_name.strip().lower()

    # Assessment
    assessments = db.query(Assessment).filter(
        Assessment.user_id == user_id
    ).all()

    for assessment in assessments:

        name = str(
            getattr(assessment, "skill_name", "")
        ).strip().lower()

        if (
            name == skill_name_normalized
            and getattr(assessment, "created_at", None)
        ):
            dates.append(assessment.created_at)

    # Practical
    practicals = db.query(PracticalChallenge).filter(
        PracticalChallenge.user_id == user_id
    ).all()

    for practical in practicals:

        name = str(
            getattr(practical, "skill_name", "")
        ).strip().lower()

        if (
            name == skill_name_normalized
            and getattr(practical, "created_at", None)
        ):
            dates.append(practical.created_at)

    if not dates:
        return None

    return max(dates)


# ---------------------------------------------------------
# FRESHNESS
# ---------------------------------------------------------

def freshness_status(
    last_date,
    months=6
) -> str:

    if last_date is None:
        return "Not Verified Yet"

    # Handle timezone-aware timestamps safely.
    now = datetime.utcnow()

    try:

        if last_date.tzinfo is not None:
            last_date = last_date.replace(tzinfo=None)

    except AttributeError:
        pass

    if now - last_date > timedelta(days=30 * months):

        return "Needs Re-verification"

    return "Verified & Fresh"


# ---------------------------------------------------------
# SKILL GAP
# ---------------------------------------------------------

def gap_label(
    required_score: float,
    verified_score: float
) -> str:

    required_score = safe_score(required_score)
    verified_score = safe_score(verified_score)

    gap = required_score - verified_score

    if gap <= 0:
        return "None"

    if gap >= 30:
        return "High"

    if gap >= 10:
        return "Medium"

    return "Low"