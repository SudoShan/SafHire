# TrustHire — Multi-College Placement Portal

A production-grade campus placement platform with AI-powered scam detection, multi-college data isolation, CDC-controlled job visibility, and role-aware dashboards.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + Vite + Tailwind CSS |
| Backend | Node.js + Express |
| Database / Auth / Storage | Supabase (PostgreSQL + RLS) |
| AI Service | Python + FastAPI |
| ML | scikit-learn (TF-IDF + Logistic Regression) |
| LLM (optional) | OpenAI GPT-3.5 |

---

## Project Structure

```
SafHire/
├── frontend/          React + Vite frontend
├── backend/           Node.js + Express API
├── ai-service/        Python FastAPI AI microservice
└── database/          SQL schema and migrations
```

---

## Roles

| Role | Access |
|---|---|
| `super_admin` | Approve colleges, verify/block employers, review flagged jobs, platform analytics |
| `cdc_admin` | Manage one college — batches, groups, employer access, job assignments |
| `employer` | Create company profile, post jobs, request college access, manage applicants |
| `student` | Smart job feed, apply, save jobs, track applications, prep tools |
| `alumni` | Same as student with alumni status |

---

## Setup

### Prerequisites

- Node.js 18+
- Python 3.10+
- A Supabase project (free tier works)
- (Optional) OpenAI API key for LLM-powered explanations

---

### 1. Database

1. Go to your Supabase project → SQL Editor
2. Run `database/schema.sql` — creates all tables, RLS policies, and utility functions
3. (Optional) Run `database/seed.sql` for sample data

---

### 2. Backend

```bash
cd backend
cp .env.example .env
# Fill in your Supabase URL, keys, and secrets
npm install
npm run dev
```

Backend runs on `http://localhost:5000`

**Required `.env` values:**

```env
PORT=5000
NODE_ENV=development
FRONTEND_URL=http://localhost:5173

SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

AI_SERVICE_URL=http://localhost:8000
AI_INTERNAL_SECRET=trusthire-local-secret
SCAM_THRESHOLD=70

COOKIE_SECURE=false
BOOTSTRAP_SECRET=trusthire-bootstrap
```

---

### 3. AI Service

```bash
cd ai-service
cp .env.example .env
python -m venv venv
venv\Scripts\activate        # Windows
# source venv/bin/activate   # Mac/Linux
pip install -r requirements.txt
python main.py
```

AI service runs on `http://localhost:8000`

**Required `.env` values:**

```env
AI_PORT=8000
AI_INTERNAL_SECRET=trusthire-local-secret
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:5000
OPENAI_API_KEY=           # Optional — enables LLM explanations
```

---

### 4. Frontend

```bash
cd frontend
cp .env.example .env
npm install
npm run dev
```

Frontend runs on `http://localhost:5173`

**Required `.env` values:**

```env
VITE_API_URL=http://localhost:5000/api
```

---

### 5. Bootstrap Super Admin

After starting the backend, create the first super admin:

```bash
curl -X POST http://localhost:5000/api/auth/bootstrap \
  -H "Content-Type: application/json" \
  -d '{
    "secret": "trusthire-bootstrap",
    "email": "admin@trusthire.dev",
    "password": "Admin@1234",
    "fullName": "Super Admin"
  }'
```

Then sign in at `http://localhost:5173/login` with those credentials.

---

## Demo Flow

### As Super Admin
1. Sign in → Super Admin Dashboard
2. Go to **College Setup** → Create a college → Approve it
3. Provision a CDC Admin for that college
4. Go to **Employer Network** → Verify or block employers
5. Review **Flagged Jobs** from AI screening

### As Employer
1. Register as Employer → Sign in
2. Go to **Company Profile** → Fill details → Run domain verification
3. Request college access from the profile page
4. Go to **Post Job** → Fill job details → Submit (AI screens it automatically)
5. Go to **My Jobs** → View applicants

### As CDC Admin
1. Sign in (provisioned by super admin)
2. Go to **Workspace** → Create batches and dynamic groups
3. Review employer access requests → Approve/Reject
4. Assign approved campus jobs to batches or groups

### As Student
1. Register as Student → Sign in
2. Go to **My Profile** → Select batch, fill CGPA, skills → Upload resume
3. Go to **Jobs** → Browse eligible jobs with AI fit scores
4. Apply to jobs → Track in **Applications**
5. Open any job → View **Discussion** tab for interview tips

---

## API Reference

All endpoints are prefixed with `/api`.

### Auth
| Method | Endpoint | Description |
|---|---|---|
| POST | `/auth/bootstrap` | Create first super admin |
| POST | `/auth/register` | Register student/employer/alumni |
| POST | `/auth/login` | Sign in |
| POST | `/auth/refresh` | Refresh session |
| GET | `/auth/me` | Get current user |
| POST | `/auth/logout` | Sign out |

### Students
| Method | Endpoint | Description |
|---|---|---|
| GET | `/students/colleges` | List colleges with batches |
| GET/POST | `/students/profile` | Get or save student profile |
| POST | `/students/resume` | Upload and parse resume |
| GET | `/students/feed` | Eligible job feed |
| POST | `/students/saved-jobs/:id/toggle` | Save/unsave a job |
| GET | `/students/applications` | List applications |

### Employers
| Method | Endpoint | Description |
|---|---|---|
| GET/POST | `/employers/profile` | Get or save employer profile |
| GET | `/employers/colleges` | List colleges with access status |
| POST | `/employers/request-access` | Request college access |
| POST | `/employers/verify-domain` | Trigger domain verification |
| GET | `/employers/my-jobs` | List employer's jobs |

### Jobs
| Method | Endpoint | Description |
|---|---|---|
| GET | `/jobs` | List public jobs |
| GET | `/jobs/:id` | Job detail |
| POST | `/jobs` | Create job (triggers AI screening) |
| POST | `/jobs/:id/apply` | Apply to job |
| GET | `/jobs/:id/applicants` | List applicants (employer/CDC) |
| PATCH | `/jobs/:id/status` | Update job status |

### CDC
| Method | Endpoint | Description |
|---|---|---|
| GET | `/cdc/dashboard` | CDC dashboard stats |
| GET | `/cdc/students` | College students |
| GET/POST | `/cdc/batches` | List or create batches |
| GET/POST | `/cdc/groups` | List or create dynamic groups |
| POST | `/cdc/groups/:id/refresh-members` | Refresh group membership |
| GET | `/cdc/employer-requests` | Employer access requests |
| PATCH | `/cdc/employer-requests/:id` | Approve/reject request |
| GET | `/cdc/jobs` | Campus jobs for this college |
| POST | `/cdc/jobs/:id/assignments` | Assign job to batch/group |

### Super Admin
| Method | Endpoint | Description |
|---|---|---|
| GET/POST | `/super-admin/colleges` | List or create colleges |
| PATCH | `/super-admin/colleges/:id/status` | Approve/block college |
| POST | `/super-admin/cdc-admins` | Provision CDC admin |
| GET | `/super-admin/employers` | List all employers |
| PATCH | `/super-admin/employers/:id/status` | Verify/block employer |
| GET | `/super-admin/flagged-jobs` | Jobs flagged by AI |

### AI
| Method | Endpoint | Description |
|---|---|---|
| POST | `/ai/analyze-job` | Scam detection for a job |
| POST | `/ai/match-job` | Student-job fit score |
| POST | `/ai/generate-prep` | Interview prep content |

### Discussions
| Method | Endpoint | Description |
|---|---|---|
| GET | `/discussions/job/:id` | Get discussion thread |
| POST | `/discussions/job/:id/replies` | Post a reply |
| POST | `/discussions/job/:id/summarize` | AI summarize thread |

### Other
| Method | Endpoint | Description |
|---|---|---|
| GET | `/notifications` | List notifications |
| PATCH | `/notifications/:id/read` | Mark as read |
| GET/POST | `/appeals` | List or create appeals |
| PATCH | `/appeals/:id` | Review appeal (super admin) |
| GET | `/analytics/student` | Student analytics |
| GET | `/analytics/cdc` | CDC analytics |
| GET | `/analytics/platform` | Platform analytics |
| POST | `/votes` | Cast credibility vote |

---

## AI Service Endpoints

All require `x-internal-secret` header.

| Method | Endpoint | Description |
|---|---|---|
| POST | `/predict-scam` | Scam detection (score 0-100, risk level, red flags) |
| POST | `/match-job` | Student-job fit score (0-100) |
| POST | `/generate-prep` | Interview prep roadmap + questions |
| POST | `/summarize-discussion` | AI summary of discussion thread |
| POST | `/extract-resume-skills` | Parse resume file for skills |
| GET | `/health` | Health check |

---

## Key Features

### AI Scam Detection (3-layer)
1. **Keyword detection** — 50+ scam keywords with weighted scoring
2. **ML classifier** — TF-IDF + Logistic Regression trained on labeled examples
3. **LLM explanation** — GPT-3.5 generates human-readable explanation (falls back to rule-based)

Jobs with scam score ≥ 70 are auto-blocked. Score 50-69 → restricted. Below 50 → approved.

### Multi-College Isolation
- Each college is a separate data silo
- Supabase RLS enforces college-scoped access at the database level
- CDC admins can only see their own college's data
- Campus jobs are only visible to assigned students

### Dynamic Groups
CDC admins can create groups with filters:
- Department
- Min CGPA
- Max backlogs
- Graduation year
- Required skills

Groups auto-refresh membership when criteria change.

### Employer Credibility Score
- Starts at 50
- Increases with upvotes from students/alumni/CDC
- Decreases with downvotes and scam reports
- Weighted by voter role (super_admin=5, cdc_admin=4, alumni=2, student=1)

---

## Security

- JWT tokens in httpOnly cookies (not localStorage)
- Supabase RLS on every table
- Service role key never exposed to browser
- All sensitive operations go through server-side routes
- Audit log for every important action
- Rate limiting: 300 requests per 15 minutes per IP
- Input validation on all endpoints

---

## Environment Variables Summary

### Backend (`backend/.env`)
```
PORT, NODE_ENV, FRONTEND_URL
SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY
AI_SERVICE_URL, AI_INTERNAL_SECRET, SCAM_THRESHOLD
COOKIE_SECURE, BOOTSTRAP_SECRET
```

### AI Service (`ai-service/.env`)
```
AI_PORT, AI_HOST, AI_RELOAD
AI_INTERNAL_SECRET, ALLOWED_ORIGINS
OPENAI_API_KEY (optional)
SCAM_MODEL_PATH, VECTORIZER_PATH
```

### Frontend (`frontend/.env`)
```
VITE_API_URL
```
