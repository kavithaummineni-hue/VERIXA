import os
from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

# Load variables from .env file
load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

# If DATABASE_URL is empty or not set, default to a robust SQLite file database
if not DATABASE_URL:
    db_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "verixa.db")
    DATABASE_URL = f"sqlite:///{db_path}"

# Create the database engine
if DATABASE_URL.startswith("sqlite"):
    engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
else:
    try:
        engine = create_engine(DATABASE_URL)
        # Test connection
        with engine.connect() as conn:
            pass
    except Exception as e:
        print(f"[VERIXA DB] MySQL connection failed ({e}), falling back to SQLite verixa.db")
        db_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "verixa.db")
        DATABASE_URL = f"sqlite:///{db_path}"
        engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})

# Create a session factory
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Base class for all our models (tables)
Base = declarative_base()


def auto_migrate_schema():
    """Ensure newly added columns and tables exist in the target database without data loss."""
    from sqlalchemy import text
    with engine.connect() as conn:
        # Columns to ensure in assessment_results
        assessment_cols = [
            ("technical_score", "FLOAT NULL"),
            ("aptitude_score", "FLOAT NULL"),
            ("communication_score", "FLOAT NULL"),
            ("team_score", "FLOAT NULL"),
            ("problem_solving_score", "FLOAT NULL"),
            ("verbal_score", "FLOAT NULL"),
            ("coding_score", "FLOAT NULL"),
            ("strengths", "TEXT NULL"),
            ("target_role", "VARCHAR(100) NULL"),
            ("selected_skills", "TEXT NULL"),
            ("where_to_improve", "TEXT NULL"),
            ("review_data", "TEXT NULL"),
            ("attempt_number", "INT DEFAULT 1"),
            ("tab_switch_violations", "INT DEFAULT 0"),
            ("proctoring_status", "VARCHAR(50) DEFAULT 'Clean'"),
            ("certificate_id", "VARCHAR(100) NULL"),
            ("assessment_date", "DATETIME DEFAULT CURRENT_TIMESTAMP"),
        ]
        for col, col_type in assessment_cols:
            try:
                conn.execute(text(f"ALTER TABLE assessment_results ADD COLUMN {col} {col_type}"))
                conn.commit()
            except Exception:
                pass

        # Columns to ensure in overall_career_scores
        score_cols = [
            ("assessment_score", "FLOAT DEFAULT 0.0"),
            ("project_score", "FLOAT DEFAULT 0.0"),
            ("skill_score", "FLOAT DEFAULT 0.0"),
            ("resume_score", "FLOAT DEFAULT 0.0"),
            ("certificate_score", "FLOAT DEFAULT 0.0"),
            ("overall_score", "FLOAT DEFAULT 0.0"),
            ("is_complete", "BOOLEAN DEFAULT 0"),
            ("status", "VARCHAR(50) DEFAULT 'Incomplete'"),
            ("message", "TEXT NULL"),
            ("calculated_at", "DATETIME DEFAULT CURRENT_TIMESTAMP"),
        ]
        for col, col_type in score_cols:
            try:
                conn.execute(text(f"ALTER TABLE overall_career_scores ADD COLUMN {col} {col_type}"))
                conn.commit()
            except Exception:
                pass

        # Columns to ensure in resume_analysis
        resume_cols = [
            ("file_path", "VARCHAR(500) NULL"),
            ("file_type", "VARCHAR(50) DEFAULT 'pdf'"),
            ("extracted_phone", "VARCHAR(50) NULL"),
            ("missing_sections", "TEXT NULL"),
            ("completeness_details", "TEXT NULL"),
            ("verification_status", "VARCHAR(50) DEFAULT 'Uploaded & Analyzed'"),
            ("resume_score", "FLOAT DEFAULT 0.0"),
        ]
        for col, col_type in resume_cols:
            try:
                conn.execute(text(f"ALTER TABLE resume_analysis ADD COLUMN {col} {col_type}"))
                conn.commit()
            except Exception:
                pass

        # Columns to ensure in student_projects
        project_cols = [
            ("name", "VARCHAR(255) NULL"),
            ("description", "TEXT NULL"),
            ("technologies_used", "VARCHAR(500) NULL"),
            ("skills_used", "TEXT NULL"),
            ("github_link", "VARCHAR(500) NULL"),
            ("demo_link", "VARCHAR(500) NULL"),
            ("status", "VARCHAR(50) DEFAULT 'Completed'"),
            ("show_on_resume", "BOOLEAN DEFAULT 1"),
            ("project_score", "FLOAT DEFAULT 10.0"),
            ("folder_path", "VARCHAR(500) NULL"),
            ("total_files", "INT DEFAULT 0"),
            ("created_at", "DATETIME DEFAULT CURRENT_TIMESTAMP"),
            ("updated_at", "DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP"),
        ]
        for col, col_type in project_cols:
            try:
                conn.execute(text(f"ALTER TABLE student_projects ADD COLUMN {col} {col_type}"))
                conn.commit()
            except Exception:
                pass

        # Columns to ensure in certificate_verifications
        cert_cols = [
            ("file_path", "VARCHAR(500) NULL"),
            ("certificate_name", "VARCHAR(255) NULL"),
            ("issuing_organization", "VARCHAR(200) NULL"),
            ("skill_name", "VARCHAR(150) NULL"),
            ("issue_date", "VARCHAR(100) NULL"),
            ("credential_id", "VARCHAR(150) NULL"),
            ("recipient_name", "VARCHAR(150) NULL"),
            ("verification_url", "VARCHAR(300) NULL"),
            ("verification_status", "VARCHAR(50) DEFAULT 'Unable to independently verify'"),
            ("verification_notes", "TEXT NULL"),
            ("score", "FLOAT DEFAULT 0.0"),
            ("created_at", "DATETIME DEFAULT CURRENT_TIMESTAMP"),
        ]
        for col, col_type in cert_cols:
            try:
                conn.execute(text(f"ALTER TABLE certificate_verifications ADD COLUMN {col} {col_type}"))
                conn.commit()
            except Exception:
                pass

        # Columns to ensure in evidence
        evidence_cols = [
            ("extracted_name", "VARCHAR(150) NULL"),
            ("extracted_email", "VARCHAR(150) NULL"),
            ("detected_skills", "TEXT NULL"),
            ("issuer", "VARCHAR(200) NULL"),
            ("issue_date", "VARCHAR(50) NULL"),
            ("identity_match", "VARCHAR(30) DEFAULT 'NOT CHECKED'"),
            ("verification_status", "VARCHAR(30) DEFAULT 'PENDING'"),
            ("verification_message", "TEXT NULL"),
            ("score", "FLOAT DEFAULT 75.0"),
            ("created_at", "DATETIME DEFAULT CURRENT_TIMESTAMP"),
        ]
        for col, col_type in evidence_cols:
            try:
                conn.execute(text(f"ALTER TABLE evidence ADD COLUMN {col} {col_type}"))
                conn.commit()
            except Exception:
                pass

        # Columns to ensure in real_job_listings
        job_cols = [
            ("work_mode", "VARCHAR(50) DEFAULT 'Remote'"),
            ("is_saved", "BOOLEAN DEFAULT 0"),
        ]
        for tbl in ["real_job_listings", "real_jobs"]:
            for col, col_type in job_cols:
                try:
                    conn.execute(text(f"ALTER TABLE {tbl} ADD COLUMN {col} {col_type}"))
                    conn.commit()
                except Exception:
                    pass


# Dependency function used by FastAPI routes to get a database session
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

