from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from pydantic import BaseModel, EmailStr

from database import Base, engine, get_db, auto_migrate_schema
from models import User

from auth import (
    hash_password,
    verify_password,
    create_access_token
)

from dependencies import get_current_user

from routers import (
    phase2,
    phase3,
    phase4,
    phase5,
    assessment,
    documents,
    projects,
    score,
    jobs
)


# ============================================================
# DATABASE
# ============================================================

Base.metadata.create_all(bind=engine)
auto_migrate_schema()



# ============================================================
# FASTAPI APPLICATION
# ============================================================

app = FastAPI(
    title="VERIXA API",
    description="Prove. Improve. Connect.",
    version="1.0.0"
)


# ============================================================
# CORS
# ============================================================

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:8000",
        "http://127.0.0.1:8000",
        "*"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)


# ============================================================
# REQUEST SCHEMAS
# ============================================================

class RegisterRequest(BaseModel):
    name: str
    email: EmailStr
    password: str
    role: str


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


# ============================================================
# ROOT & HEALTH CHECK
# ============================================================

@app.get("/")
def root():
    return {
        "message": "VERIXA API is running",
        "status": "success"
    }


@app.get("/health")
@app.get("/api/health")
def health_check():
    return {
        "status": "ok",
        "message": "VERIXA backend is running"
    }


# ============================================================
# REGISTER
# ============================================================

@app.post("/register")
def register(
    request: RegisterRequest,
    db: Session = Depends(get_db)
):

    # Check if email already exists
    existing_user = (
        db.query(User)
        .filter(User.email == request.email)
        .first()
    )

    if existing_user:
        raise HTTPException(
            status_code=400,
            detail="Email already registered"
        )

    # Allowed roles
    allowed_roles = [
        "student",
        "company",
        "college",
        "admin"
    ]

    if request.role not in allowed_roles:
        raise HTTPException(
            status_code=400,
            detail=f"Role must be one of {allowed_roles}"
        )

    # Create user
    new_user = User(
        name=request.name,
        email=request.email,
        password=hash_password(request.password),
        role=request.role
    )

    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    return {
        "message": "User registered successfully",
        "user": {
            "id": new_user.id,
            "name": new_user.name,
            "email": new_user.email,
            "role": new_user.role
        }
    }


# ============================================================
# LOGIN
# ============================================================

@app.post("/login")
def login(
    request: LoginRequest,
    db: Session = Depends(get_db)
):

    user = (
        db.query(User)
        .filter(User.email == request.email)
        .first()
    )

    # Validate user
    if not user:
        raise HTTPException(
            status_code=401,
            detail="Invalid email or password"
        )

    # Validate password
    if not verify_password(
        request.password,
        user.password
    ):
        raise HTTPException(
            status_code=401,
            detail="Invalid email or password"
        )

    # Create JWT token
    token = create_access_token({
        "sub": str(user.id),
        "role": user.role
    })

    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": user.id,
            "name": user.name,
            "email": user.email,
            "role": user.role
        }
    }


# ============================================================
# CURRENT USER
# ============================================================

@app.get("/me")
def read_current_user(
    current_user: User = Depends(get_current_user)
):

    return {
        "id": current_user.id,
        "name": current_user.name,
        "email": current_user.email,
        "role": current_user.role
    }


# ============================================================
# PHASE 2 ROUTER
# ============================================================

app.include_router(
    phase2.router
)


# ============================================================
# PHASE 3 ROUTER
# ============================================================

app.include_router(
    phase3.router
)


# ============================================================
# PHASE 4 ROUTER
# ============================================================

app.include_router(
    phase4.router
)


# ============================================================
# PHASE 5 ROUTER
# ============================================================

app.include_router(
    phase5.router
)


# ============================================================
# ASSESSMENT ROUTER
# ============================================================

app.include_router(
    assessment.router
)
app.include_router(documents.router)
app.include_router(documents.resume_router)
app.include_router(projects.router)
app.include_router(score.router)
app.include_router(jobs.router)


# ============================================================
# SERVER STARTUP
# ============================================================

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)


