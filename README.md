# 🛡️ TrustHire - AI-Powered Placement Portal

**TrustHire** is a full-stack, AI-secured placement platform that protects students from scam job postings using a 3-layer AI detection engine, community-driven trust scoring, and verified employer profiles.

## 🏗️ Architecture

```
SafHire/
├── frontend/              # React + Tailwind CSS (Vite)
│   ├── src/
│   │   ├── components/    # Reusable UI components
│   │   ├── context/       # React context (Auth)
│   │   ├── lib/           # API client, Supabase config
│   │   └── pages/         # Page components
│   └── ...
├── backend/               # Node.js + Express
│   └── src/
│       ├── config/        # Supabase client
│       ├── middleware/     # Auth middleware
│       └── routes/        # API routes
├── ai-service/            # Python FastAPI
│   ├── main.py            # FastAPI server
│   ├── scam_detector.py   # 3-layer scam detection
│   ├── resume_parser.py   # PDF/DOCX resume parsing
│   └── interview_prep.py  # AI interview preparation
└── database/              # SQL schemas
    ├── schema.sql          # Database schema
    └── seed.sql            # Sample data
```

## 🚀 Quick Start

### Prerequisites
- Node.js 20+
- Python 3.10+
- Supabase account (free tier works)

### 1. Database Setup
1. Create a new Supabase project at [supabase.com](https://supabase.com)
2. Go to SQL Editor and run `database/schema.sql`
3. Create a `resumes` storage bucket (public access)

### 2. Backend
```bash
cd backend
cp .env.example .env
# Fill in your Supabase URL, keys, and SMTP credentials
npm install
npm run dev
```

### 3. AI Service
```bash
cd ai-service
python -m venv venv
# Windows: venv\Scripts\activate | Mac/Linux: source venv/bin/activate
pip install -r requirements.txt
python main.py
```

### 4. Frontend
```bash
cd frontend
cp .env.example .env
# Fill in your Supabase URL and anon key
npm install
npm run dev
```

## 🔑 Features

### AI Scam Detection (3 Layers)
| Layer | Method | Description |
|-------|--------|-------------|
| Layer 1 | **Keyword Detection** | Rule-based scanning for 50+ scam indicators |
| Layer 2 | **ML Classifier** | TF-IDF + Logistic Regression trained on labeled data |
| Layer 3 | **LLM Reasoning** | OpenAI GPT-3.5 for explanation (with fallback) |

Combined scores are weighted: L1 (30%) + L2 (40%) + L3 (30%)

### Credibility System
- **Weighted voting**: Student (1x), Alumni (2x), Admin (5x)
- Dynamic employer trust score aggregated from all job votes

### Authentication & Verification
- Supabase Auth (email/password)
- DNS domain verification for employers
- OTP email verification

### AI Interview Preparation
- Domain-aware topic generation (software, frontend, backend, data science, product)
- Skill-specific interview questions
- LLM-powered personalized prep (with rule-based fallback)

## 📡 API Endpoints

| Route | Methods | Description |
|-------|---------|-------------|
| `/api/auth` | POST login, register, logout, refresh | Authentication |
| `/api/jobs` | GET, POST, PUT | Job CRUD + AI analysis |
| `/api/jobs/:id/apply` | POST | Job application |
| `/api/jobs/:id/appeal` | POST | Appeal flagged job |
| `/api/students` | GET, POST | Student profile + resume |
| `/api/employers` | GET, POST | Employer profile + verification |
| `/api/discussions/:jobId` | GET, POST | Job discussion threads |
| `/api/credibility/vote/:jobId` | GET, POST | Voting system |
| `/api/ai/analyze-job` | POST | AI scam analysis |
| `/api/ai/preparation` | POST | Interview prep |
| `/api/admin/*` | GET, PUT | Admin dashboard & review |

## 🧪 AI Service Endpoints

| Endpoint | Description |
|----------|-------------|
| `POST /predict-scam` | Multi-layer scam detection |
| `POST /parse-resume` | Resume skill extraction |
| `POST /interview-prep` | Interview preparation |
| `POST /summarize-discussion` | Discussion summarization |

## 🔐 Environment Variables

### Backend (.env)
- `SUPABASE_URL` / `SUPABASE_ANON_KEY` / `SUPABASE_SERVICE_ROLE_KEY`
- `AI_SERVICE_URL` (default: http://localhost:8000)
- `SCAM_THRESHOLD` (default: 70)
- SMTP settings for OTP emails

### AI Service (.env)
- `OPENAI_API_KEY` (optional, for LLM layer)

### Frontend (.env)
- `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY`
- `VITE_API_URL` (default: /api via proxy)

## 📝 License
MIT
