# VERIXA — All Phases (1 to 5)

"Prove. Improve. Connect."

This package contains the FULL working prototype for SIH26044:
React frontend + FastAPI backend + MySQL database, covering:

- **Phase 1** - Auth: register, login, JWT, /me, /health
- **Phase 2** - Student profile, skills, evidence
- **Phase 3** - Assessments, practical challenges, verified score,
  claimed-vs-verified, skill gap analysis, learning roadmap
- **Phase 4** - Companies, jobs, explainable verified-skill matching,
  reverse recruitment (ranked candidates)
- **Phase 5** - Student dashboard, digital skill passport, skill freshness,
  college dashboard, rule-based AI career assistant

## Folder structure

```
VERIXA
├── backend
│   ├── .env.example
│   ├── database.py
│   ├── models.py            (all tables, Phase 1-4)
│   ├── auth.py               (password hashing + JWT)
│   ├── scoring.py             (verified-score / gap / freshness logic - Phase 3-5)
│   ├── main.py                (Phase 1 routes + includes all routers)
│   ├── requirements.txt
│   └── routers
│       ├── phase2.py          (profile, skills, evidence)
│       ├── phase3.py          (assessments, practicals, skill gap, roadmap)
│       ├── phase4.py          (companies, jobs, matching, reverse recruitment)
│       └── phase5.py          (dashboards, passport, career assistant)
└── frontend
    ├── index.html
    ├── package.json
    ├── vite.config.js
    └── src
        ├── main.jsx
        ├── App.jsx           (auth screens + a generic "API Tester" panel
        │                       to try every Phase 2-5 endpoint from the browser)
        └── index.css
```

## 1. MySQL setup

```sql
CREATE DATABASE verixa_db;
```

## 2. Backend setup (PowerShell)

```powershell
cd VERIXA\backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
copy .env.example .env
```

Open `.env`, set your real MySQL password in `DATABASE_URL`, and set
`SECRET_KEY` to any long random string.

Run the backend:

```powershell
uvicorn main:app --reload
```

- Backend: http://127.0.0.1:8000
- Swagger docs (best place to test everything quickly): http://127.0.0.1:8000/docs

All tables (users, student_profiles, skills, evidence, assessments,
practical_challenges, companies, jobs, job_requirements) are created
automatically the first time you run the backend.

## 3. Frontend setup (PowerShell, new terminal tab)

```powershell
cd VERIXA\frontend
npm install
npm run dev
```

Frontend: http://localhost:5173

The app has two parts:
1. The original Register / Login / Check-/me screen (Phase 1).
2. An **API Tester** panel below it - pick any Phase 2-5 endpoint from the
   dropdown, edit the JSON body if needed, and click Send to see the raw
   response. This lets you exercise the whole workflow without writing
   more frontend code.

## Suggested test flow (matches the CLAIM -> EVIDENCE -> VERIFY -> MATCH story)

1. **Register** a student (role=student) and a company (role=company) via
   the Register screen or Swagger `/register`.
2. **POST /profile** - create the student's profile (use the returned user id).
3. **POST /skills** - add a skill, e.g. Python, claimed_level="Advanced".
   Note the returned `skill.id`.
4. **POST /evidence** - attach a project/certificate to that skill using
   the `skill_id` from step 3.
5. **POST /assessments** and **POST /practical-challenges** - record a
   quiz score and a coding-challenge score for the same skill_name.
6. **GET /verified-score/{user_id}/{skill_name}** - see claimed vs
   verified level and score.
7. **POST /skill-gap** and **POST /learning-roadmap** - compare the
   student's verified skills against a set of required skills.
8. **POST /companies** then **POST /jobs** (with `required_skills`) -
   create a company and a job posting.
9. **GET /jobs/{job_id}/match/{user_id}** - see the explainable match score.
10. **GET /jobs/{job_id}/candidates** - reverse recruitment ranking.
11. **GET /dashboard/student/{user_id}** and **GET /passport/{user_id}** -
    the final student-facing views.
12. **GET /dashboard/college** - institution-level analytics across all
    students.
13. **GET /career-assistant/{user_id}/{job_id}** - rule-based recommendation
    on what to learn next for that specific job.

## Notes on the scoring logic (for your SIH presentation)

- **Verified score** = average of whichever of these exist for a skill:
  assessment score, practical challenge score, average evidence score.
  A skill with no assessment/practical/evidence yet returns
  `verified_score: 0, verified_level: "Not Verified"` - this is intentional:
  claims alone never produce a verified score.
- **Verified level buckets**: 0-39 Beginner, 40-69 Intermediate,
  70-84 Advanced, 85-100 Expert (see `scoring.py`, easy to tune).
- **Skill gap** label: None / Low / Medium / High based on how far the
  verified score is below the required score.
- **Match score** for a job = average, across required skills, of
  `min(100, verified/required * 100)` - this rewards meeting or exceeding
  every requirement and is easy to explain slide-by-slide.
- **Skill freshness**: a skill is "Needs Re-verification" if its most
  recent assessment/practical is older than 6 months (`scoring.py`,
  `freshness_status`, easy to change).

## Notes

- Keep the backend and frontend running in two separate PowerShell windows.
- If you see CORS or "Failed to fetch" errors, make sure the backend
  (port 8000) is running before using the frontend.
- Don't commit your real `.env` (holds your DB password and JWT secret) -
  only `.env.example` is meant to be shared/committed.
- This is a hackathon prototype: evidence scoring is currently a simple
  numeric field you set when adding evidence (default 75). In a later
  iteration this is where an admin-review workflow or an automated
  checker (e.g. running submitted code, validating certificates) would plug in.
