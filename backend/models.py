from datetime import datetime

from sqlalchemy import (
    Column,
    Integer,
    String,
    Float,
    Text,
    ForeignKey,
    DateTime
)

from database import Base


# ============================================================
# PHASE 1 - USER
# ============================================================

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)

    name = Column(
        String(100),
        nullable=False
    )

    email = Column(
        String(150),
        unique=True,
        index=True,
        nullable=False
    )

    password = Column(
        String(255),
        nullable=False
    )

    # student, company, college, admin
    role = Column(
        String(20),
        nullable=False
    )


# ============================================================
# PHASE 2 - STUDENT PROFILE
# ============================================================

class StudentProfile(Base):
    __tablename__ = "student_profiles"

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    user_id = Column(
        Integer,
        ForeignKey("users.id"),
        nullable=False
    )

    college = Column(
        String(150)
    )

    branch = Column(
        String(150)
    )

    graduation_year = Column(
        Integer
    )

    bio = Column(
        Text
    )

    github = Column(
        String(255)
    )

    linkedin = Column(
        String(255)
    )


# ============================================================
# PHASE 2 - SKILLS
# ============================================================

class Skill(Base):
    __tablename__ = "skills"

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    user_id = Column(
        Integer,
        ForeignKey("users.id"),
        nullable=False
    )

    skill_name = Column(
        String(100),
        nullable=False
    )

    # Beginner, Intermediate, Advanced, Expert
    claimed_level = Column(
        String(30)
    )

    experience_years = Column(
        Float,
        default=0
    )


# ============================================================
# PHASE 2 - EVIDENCE
# ============================================================

class Evidence(Base):
    __tablename__ = "evidence"

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    # Student who submitted the evidence
    user_id = Column(
        Integer,
        ForeignKey("users.id"),
        nullable=False
    )

    # Skill connected with the evidence
    skill_id = Column(
        Integer,
        ForeignKey("skills.id"),
        nullable=False
    )

    # --------------------------------------------------------
    # BASIC EVIDENCE INFORMATION
    # --------------------------------------------------------

    # Project, Certificate, GitHub Repository,
    # Internship, Practical Work, Assessment
    evidence_type = Column(
        String(50)
    )

    # Original document/project title
    title = Column(
        String(200)
    )

    # Extracted text or description
    description = Column(
        Text
    )

    # External link if provided
    link = Column(
        String(255)
    )

    # --------------------------------------------------------
    # DOCUMENT ANALYSIS
    # --------------------------------------------------------

    # Name extracted from resume/certificate
    extracted_name = Column(
        String(150)
    )

    # Email extracted from resume
    extracted_email = Column(
        String(150)
    )

    # Skills detected from submitted evidence
    #
    # Example:
    # Python, SQL, FastAPI, Machine Learning
    #
    # Stored as text so multiple skills can be saved.
    detected_skills = Column(
        Text
    )

    # --------------------------------------------------------
    # CERTIFICATE INFORMATION
    # --------------------------------------------------------

    # Certificate issuing organization
    issuer = Column(
        String(200)
    )

    # Certificate issue/completion date
    issue_date = Column(
        String(50)
    )

    # --------------------------------------------------------
    # IDENTITY VERIFICATION
    # --------------------------------------------------------

    # Possible values:
    #
    # MATCH
    # MISMATCH
    # PARTIAL MATCH
    # NOT CHECKED
    identity_match = Column(
        String(30),
        default="NOT CHECKED"
    )

    # --------------------------------------------------------
    # VERIFICATION STATUS
    # --------------------------------------------------------

    # Possible values:
    #
    # PENDING
    # VERIFIED
    # REJECTED
    # NEEDS REVIEW
    verification_status = Column(
        String(30),
        default="PENDING"
    )

    # Explanation of verification result
    #
    # Example:
    # "Certificate name matches student profile."
    #
    # or:
    # "Certificate name does not match student."
    verification_message = Column(
        Text
    )

    # --------------------------------------------------------
    # EVIDENCE SCORE
    # --------------------------------------------------------

    # System-generated evidence quality score.
    #
    # IMPORTANT:
    # This is NOT automatically 75.
    #
    # The verification system will calculate it based on
    # actual evidence analysis.
    score = Column(
        Float,
        default=0
    )

    # --------------------------------------------------------
    # TIMESTAMP
    # --------------------------------------------------------

    created_at = Column(
        DateTime,
        default=datetime.utcnow
    )


# ============================================================
# PHASE 3 - SKILL ASSESSMENT
# ============================================================

class Assessment(Base):
    __tablename__ = "assessments"

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    user_id = Column(
        Integer,
        ForeignKey("users.id"),
        nullable=False
    )

    skill_name = Column(
        String(100),
        nullable=False
    )

    # Assessment score: 0-100
    score = Column(
        Float,
        nullable=False
    )

    created_at = Column(
        DateTime,
        default=datetime.utcnow
    )


class AssessmentResult(Base):
    __tablename__ = "assessment_results"

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    user_id = Column(
        Integer,
        ForeignKey("users.id"),
        nullable=False
    )

    skill = Column(
        String(100),
        nullable=False
    )

    total_questions = Column(
        Integer,
        nullable=False
    )

    correct_answers = Column(
        Integer,
        nullable=False
    )

    wrong_answers = Column(
        Integer,
        nullable=False
    )

    score = Column(
        Float,
        nullable=False
    )

    percentage = Column(
        Float,
        nullable=False
    )

    status = Column(
        String(50),
        nullable=False
    )

    technical_score = Column(
        Float,
        default=0.0
    )

    aptitude_score = Column(
        Float,
        default=0.0
    )

    verbal_score = Column(
        Float,
        default=0.0
    )

    coding_score = Column(
        Float,
        default=0.0
    )

    communication_score = Column(
        Float,
        default=0.0
    )

    team_score = Column(
        Float,
        default=0.0
    )

    problem_solving_score = Column(
        Float,
        default=0.0
    )

    target_role = Column(
        String(150),
        default='Software Developer'
    )

    selected_skills = Column(
        Text,
        default=''
    )

    strengths = Column(
        Text,
        default=''
    )

    where_to_improve = Column(
        Text,
        default=''
    )

    review_data = Column(
        Text,
        default='[]'
    )

    attempt_number = Column(
        Integer,
        default=1
    )

    tab_switch_violations = Column(
        Integer,
        default=0
    )

    proctoring_status = Column(
        String(50),
        default='Clean'
    )

    certificate_id = Column(
        String(100),
        nullable=True
    )

    assessment_date = Column(
        DateTime,
        default=datetime.utcnow
    )



class AssessmentQuestion(Base):
    __tablename__ = "assessment_questions"

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    skill = Column(
        String(100),
        nullable=False,
        index=True
    )

    question = Column(
        Text,
        nullable=False
    )

    option1 = Column(
        String(255),
        nullable=False
    )

    option2 = Column(
        String(255),
        nullable=False
    )

    option3 = Column(
        String(255),
        nullable=False
    )

    option4 = Column(
        String(255),
        nullable=False
    )

    correct_option = Column(
        Integer,
        nullable=False
    )

    difficulty = Column(
        String(20),
        default="medium"
    )


class AssessmentAnswer(Base):
    __tablename__ = "assessment_answers"

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    assessment_id = Column(
        Integer,
        ForeignKey("assessment_results.id"),
        nullable=False
    )

    question_id = Column(
        Integer,
        nullable=False
    )

    selected_option = Column(
        Integer,
        nullable=False
    )

    is_correct = Column(
        Integer,
        default=0
    )


# ============================================================
# PHASE 3 - PRACTICAL CHALLENGE
# ============================================================

class PracticalChallenge(Base):
    __tablename__ = "practical_challenges"

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    user_id = Column(
        Integer,
        ForeignKey("users.id"),
        nullable=False
    )

    skill_name = Column(
        String(100),
        nullable=False
    )

    title = Column(
        String(200)
    )

    # Practical score: 0-100
    score = Column(
        Float,
        nullable=False
    )

    created_at = Column(
        DateTime,
        default=datetime.utcnow
    )


# ============================================================
# PHASE 4 - COMPANY
# ============================================================

class Company(Base):
    __tablename__ = "companies"

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    # Company owner account
    # Usually role = company
    user_id = Column(
        Integer,
        ForeignKey("users.id"),
        nullable=False
    )

    company_name = Column(
        String(150),
        nullable=False
    )

    industry = Column(
        String(150)
    )

    location = Column(
        String(150)
    )

    website = Column(
        String(255)
    )

    description = Column(
        Text
    )


# ============================================================
# PHASE 4 - JOB
# ============================================================

class Job(Base):
    __tablename__ = "jobs"

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    company_id = Column(
        Integer,
        ForeignKey("companies.id"),
        nullable=False
    )

    title = Column(
        String(150),
        nullable=False
    )

    description = Column(
        Text
    )


# ============================================================
# PHASE 4 - JOB REQUIREMENTS
# ============================================================

class JobRequirement(Base):
    __tablename__ = "job_requirements"

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    job_id = Column(
        Integer,
        ForeignKey("jobs.id"),
        nullable=False
    )

    skill_name = Column(
        String(100),
        nullable=False
    )

    # Required skill score: 0-100
    required_score = Column(
        Float,
        nullable=False
    )
# ============================================================
# STUDENT PROJECT PORTFOLIO & SKILL-LINKED ANALYSIS
# ============================================================
class StudentProject(Base):
    __tablename__ = 'student_projects'
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey('users.id'), nullable=False)
    name = Column(String(200), nullable=False)
    description = Column(Text, default='')
    technologies_used = Column(Text, default='')
    skills_used = Column(Text, default='')
    github_link = Column(String(255), default='')
    demo_link = Column(String(255), default='')
    status = Column(String(30), default='Not Started') # 'Not Started', 'In Progress', 'Completed'
    show_on_resume = Column(Integer, default=1) # 1 = Show on Resume, 0 = Hide
    project_score = Column(Float, default=0.0)
    folder_path = Column(String(300), default='')
    total_files = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class ProjectSkill(Base):
    __tablename__ = 'project_skills'
    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey('student_projects.id'), nullable=False)
    user_id = Column(Integer, ForeignKey('users.id'), nullable=False)
    skill_id = Column(Integer, ForeignKey('skills.id'), nullable=True)
    skill_name = Column(String(100), nullable=False)
    evidence_status = Column(String(50), default='Not Checked') # 'Detected', 'Partially Detected', 'Not Detected'
    evidence_details = Column(Text, default='')
    evidence_score = Column(Float, default=0.0) # 0 to 100
    created_at = Column(DateTime, default=datetime.utcnow)


class ProjectAnalysis(Base):
    __tablename__ = 'project_analysis'
    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey('student_projects.id'), nullable=False)
    user_id = Column(Integer, ForeignKey('users.id'), nullable=False)
    status_score = Column(Float, default=0.0) # out of 20
    tech_implementation_score = Column(Float, default=0.0) # out of 30
    skill_evidence_score = Column(Float, default=0.0) # out of 25
    structure_score = Column(Float, default=0.0) # out of 15
    documentation_score = Column(Float, default=0.0) # out of 10
    total_project_score = Column(Float, default=0.0) # 0 - 100
    detected_languages = Column(Text, default='[]')
    detected_frameworks = Column(Text, default='[]')
    detected_databases = Column(Text, default='[]')
    frontend_tech = Column(Text, default='[]')
    backend_tech = Column(Text, default='[]')
    file_count = Column(Integer, default=0)
    source_file_count = Column(Integer, default=0)
    lines_of_code = Column(Integer, default=0)
    has_readme = Column(Integer, default=0)
    readme_summary = Column(Text, default='')
    structure_summary = Column(Text, default='')
    verification_summary = Column(Text, default='')
    analyzed_at = Column(DateTime, default=datetime.utcnow)


# ============================================================
# RESUME ANALYSIS & VERIFICATION
# ============================================================
class ResumeAnalysis(Base):
    __tablename__ = 'resume_analysis'
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey('users.id'), nullable=False)
    filename = Column(String(255), nullable=False)
    file_path = Column(String(500), default='')
    file_type = Column(String(50), default='pdf')
    extracted_name = Column(String(150), default='')
    extracted_email = Column(String(150), default='')
    extracted_phone = Column(String(50), default='')
    education = Column(Text, default='')
    skills = Column(Text, default='')
    experience = Column(Text, default='')
    projects = Column(Text, default='')
    certifications = Column(Text, default='')
    achievements = Column(Text, default='')
    resume_score = Column(Float, default=0.0)
    missing_sections = Column(Text, default='')
    completeness_details = Column(Text, default='')
    verification_status = Column(String(50), default='Uploaded & Analyzed')
    created_at = Column(DateTime, default=datetime.utcnow)


# ============================================================
# CERTIFICATE VERIFICATION RECORDS
# ============================================================
class CertificateVerificationRecord(Base):
    __tablename__ = 'certificate_verifications'
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey('users.id'), nullable=False)
    filename = Column(String(255), nullable=False)
    file_path = Column(String(500), default='')
    certificate_name = Column(String(255), nullable=False)
    issuing_organization = Column(String(200), default='')
    skill_name = Column(String(150), default='')
    issue_date = Column(String(100), default='')
    credential_id = Column(String(150), default='')
    recipient_name = Column(String(150), default='')
    verification_url = Column(String(300), default='')
    verification_status = Column(String(50), default='Unable to independently verify') # VERIFIED, Unable to independently verify, MISMATCH
    verification_notes = Column(Text, default='')
    score = Column(Float, default=0.0)
    created_at = Column(DateTime, default=datetime.utcnow)


# ============================================================
# REAL JOB LISTINGS (AUTHENTIC SOURCES ONLY)
# ============================================================
class RealJobListing(Base):
    __tablename__ = 'real_job_listings'
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(200), nullable=False)
    company = Column(String(150), nullable=False)
    location = Column(String(150), nullable=False)
    description = Column(Text, default='')
    required_skills = Column(Text, nullable=False) # e.g. "Python, SQL, Flask, Git"
    experience_level = Column(String(50), default='Entry Level') # Internship, Entry Level, Associate, Mid-Senior
    job_type = Column(String(50), default='Full-time') # Internship, Full-time, Remote, Contract
    salary = Column(String(100), default='')
    source = Column(String(100), nullable=False) # Internshala, LinkedIn Jobs, Indeed, Naukri, Wellfound, Google Careers, Microsoft Careers
    source_url = Column(String(500), nullable=False)
    posted_date = Column(String(50), default='')
    expiry_date = Column(String(50), default='')
    category = Column(String(100), default='Software Development')
    work_mode = Column(String(50), default='Hybrid') # Remote, Hybrid, On-site
    is_active = Column(Integer, default=1)
    created_at = Column(DateTime, default=datetime.utcnow)


class SavedJob(Base):
    __tablename__ = 'saved_jobs'
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey('users.id'), nullable=False)
    job_id = Column(Integer, ForeignKey('real_job_listings.id'), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)


# ============================================================
# OVERALL CAREER READINESS SCORE
# ============================================================
class OverallCareerScore(Base):
    __tablename__ = 'overall_career_scores'
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey('users.id'), nullable=False)
    assessment_score = Column(Float, nullable=True)
    skill_score = Column(Float, nullable=True)
    resume_score = Column(Float, nullable=True)
    certificate_score = Column(Float, nullable=True)
    project_score = Column(Float, default=0.0)
    overall_score = Column(Float, nullable=True)
    is_complete = Column(Integer, default=0)
    status = Column(String(50), default='Incomplete')
    message = Column(Text, default='')
    calculated_at = Column(DateTime, default=datetime.utcnow)


