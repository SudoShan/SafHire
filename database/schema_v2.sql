-- =========================================================================
-- TrustHire v2 Database Schema (Enterprise Multi-College Architecture)
-- Run this entirely in your Supabase SQL Editor
-- WARNING: This schema drops existing tables. Do not run on production data.
-- =========================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- 0. CLEANUP (For development only)
-- ============================================
DROP TABLE IF EXISTS audit_logs CASCADE;
DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS appeals CASCADE;
DROP TABLE IF EXISTS discussion_replies CASCADE;
DROP TABLE IF EXISTS discussions CASCADE;
DROP TABLE IF EXISTS votes CASCADE;
DROP TABLE IF EXISTS applications CASCADE;
DROP TABLE IF EXISTS group_membership CASCADE;
DROP TABLE IF EXISTS groups CASCADE;
DROP TABLE IF EXISTS batches CASCADE;
DROP TABLE IF EXISTS job_assignments CASCADE;
DROP TABLE IF EXISTS job_ai_reviews CASCADE;
DROP TABLE IF EXISTS jobs CASCADE;
DROP TABLE IF EXISTS employer_college_access CASCADE;
DROP TABLE IF EXISTS employer_verifications CASCADE;
DROP TABLE IF EXISTS employers CASCADE;
DROP TABLE IF EXISTS student_documents CASCADE;
DROP TABLE IF EXISTS students CASCADE;
DROP TABLE IF EXISTS cdc_admins CASCADE;
DROP TABLE IF EXISTS colleges CASCADE;
DROP TABLE IF EXISTS roles CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;

-- ============================================
-- 1. BASE ENTITIES (Users & Colleges)
-- ============================================

CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('super_admin', 'cdc_admin', 'employer', 'student', 'alumni')),
  avatar_url TEXT,
  phone_number TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE colleges (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  domain TEXT NOT NULL UNIQUE, -- e.g. "mit.edu"
  logo_url TEXT,
  location TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'blocked')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 2. ROLE-SPECIFIC PROFILES
-- ============================================

CREATE TABLE cdc_admins (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE UNIQUE,
  college_id UUID NOT NULL REFERENCES colleges(id) ON DELETE CASCADE,
  designation TEXT,
  is_verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE students (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE UNIQUE,
  college_id UUID REFERENCES colleges(id) ON DELETE CASCADE,
  enrollment_number TEXT,
  department TEXT,
  batch_year INTEGER,
  cgpa NUMERIC(4,2) DEFAULT 0.0 CHECK (cgpa >= 0.0 AND cgpa <= 10.0),
  active_backlogs INTEGER DEFAULT 0,
  history_backlogs INTEGER DEFAULT 0,
  skills TEXT[] DEFAULT '{}',
  preferred_role TEXT,
  resume_url TEXT,
  linkedin_url TEXT,
  github_url TEXT,
  is_verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(college_id, enrollment_number)
);

CREATE TABLE student_documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  document_type TEXT CHECK (document_type IN ('marksheet_10', 'marksheet_12', 'marksheet_degree', 'id_card', 'other')),
  document_url TEXT NOT NULL,
  verification_status TEXT DEFAULT 'pending' CHECK (verification_status IN ('pending', 'verified', 'rejected')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE employers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE UNIQUE,
  company_name TEXT NOT NULL,
  company_type TEXT CHECK (company_type IN ('mnc', 'startup', 'agency')),
  official_email TEXT NOT NULL UNIQUE,
  company_domain TEXT NOT NULL,
  website TEXT,
  linkedin_url TEXT,
  company_logo_url TEXT,
  company_size TEXT,
  credibility_score NUMERIC(5,2) DEFAULT 50.00,
  global_status TEXT DEFAULT 'pending' CHECK (global_status IN ('pending', 'verified', 'blocked')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE employer_verifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employer_id UUID NOT NULL REFERENCES employers(id) ON DELETE CASCADE,
  verification_type TEXT CHECK (verification_type IN ('domain_dns', 'email_otp', 'incorporation_doc', 'linkedin_manual')),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  proof_url TEXT,
  reviewer_id UUID REFERENCES profiles(id), -- Super Admin who reviewed
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Employers exist globally, but must be granted access per college
CREATE TABLE employer_college_access (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employer_id UUID NOT NULL REFERENCES employers(id) ON DELETE CASCADE,
  college_id UUID NOT NULL REFERENCES colleges(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'requested' CHECK (status IN ('requested', 'approved', 'rejected', 'revoked')),
  requested_at TIMESTAMPTZ DEFAULT NOW(),
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES cdc_admins(id),
  UNIQUE(employer_id, college_id)
);

-- ============================================
-- 3. BATCHES & DYNAMIC GROUPS (CDC Module)
-- ============================================

CREATE TABLE batches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  college_id UUID NOT NULL REFERENCES colleges(id) ON DELETE CASCADE,
  name TEXT NOT NULL, -- e.g., "2024 Computer Science"
  graduation_year INTEGER NOT NULL,
  department TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(college_id, name)
);

-- Represents a complex filter set created by CDC (e.g. "CGPA > 8 & No Backlogs")
CREATE TABLE groups (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  college_id UUID NOT NULL REFERENCES colleges(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  min_cgpa NUMERIC(4,2) DEFAULT 0.0,
  max_backlogs INTEGER DEFAULT 99,
  required_skills TEXT[] DEFAULT '{}',
  created_by UUID REFERENCES cdc_admins(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE group_membership (
  group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  added_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (group_id, student_id)
);

-- ============================================
-- 4. JOBS & AI REVIEWS
-- ============================================

CREATE TABLE jobs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employer_id UUID NOT NULL REFERENCES employers(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  role TEXT,
  salary_min NUMERIC(12,2),
  salary_max NUMERIC(12,2),
  location TEXT,
  job_type TEXT CHECK (job_type IN ('full-time', 'part-time', 'internship', 'remote')),
  global_status TEXT DEFAULT 'draft' CHECK (global_status IN ('draft', 'under_ai_review', 'verified', 'flagged_scam', 'blocked')),
  application_deadline TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Stores detailed AI analysis (Scam tracking)
CREATE TABLE job_ai_reviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE UNIQUE,
  scam_score NUMERIC(5,2) DEFAULT 0,
  risk_level TEXT DEFAULT 'low' CHECK (risk_level IN ('low', 'medium', 'high', 'critical')),
  explanation TEXT,
  extracted_red_flags TEXT[] DEFAULT '{}',
  reviewed_at TIMESTAMPTZ DEFAULT NOW()
);

-- Maps a Job to a specifically targeted Batch/Group within a College by CDC Admin
CREATE TABLE job_assignments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  college_id UUID NOT NULL REFERENCES colleges(id) ON DELETE CASCADE,
  assigned_by UUID REFERENCES cdc_admins(id),
  target_batch_id UUID REFERENCES batches(id) ON DELETE CASCADE,
  target_group_id UUID REFERENCES groups(id) ON DELETE CASCADE,
  visibility_status TEXT DEFAULT 'pending_cdc_approval' CHECK (visibility_status IN ('pending_cdc_approval', 'approved', 'restricted', 'rejected')),
  cdc_internal_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  -- Prevent exact duplicates
  UNIQUE NULLS NOT DISTINCT (job_id, college_id, target_batch_id, target_group_id)
);

-- ============================================
-- 5. APPLICATIONS & TRACKING
-- ============================================

CREATE TABLE applications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  ai_match_score NUMERIC(5,2), -- AI determined fit score
  status TEXT DEFAULT 'applied' CHECK (status IN ('applied', 'screening', 'shortlisted', 'interviewing', 'offered', 'rejected', 'withdrawn')),
  cover_letter TEXT,
  applied_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(job_id, student_id)
);

-- ============================================
-- 6. COMMUNITY (Discussions & Voting)
-- ============================================

CREATE TABLE discussions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  college_id UUID NOT NULL REFERENCES colleges(id) ON DELETE CASCADE, -- Discussions are scoped per college!
  ai_summary TEXT, -- Background worker updates this periodically
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE discussion_replies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  discussion_id UUID NOT NULL REFERENCES discussions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  is_flagged BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE votes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  vote_type TEXT NOT NULL CHECK (vote_type IN ('upvote', 'downvote', 'report_scam')),
  weight INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(job_id, user_id)
);

-- ============================================
-- 7. PLATFORM OPERATIONS (Appeals, Logs, Alerts)
-- ============================================

CREATE TABLE appeals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  employer_id UUID NOT NULL REFERENCES employers(id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  resolved_by UUID REFERENCES profiles(id), -- Super Admin who reviewed it
  created_at TIMESTAMPTZ DEFAULT NOW(),
  resolved_at TIMESTAMPTZ
);

CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  link_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  actor_id UUID NOT NULL REFERENCES profiles(id),
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL, -- e.g. 'job', 'employer', 'student'
  entity_id UUID,
  details JSONB,
  ip_address TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==========================================================
-- INDEXES FOR PERFORMANCE
-- ==========================================================
CREATE INDEX idx_students_college ON students(college_id);
CREATE INDEX idx_jobs_employer ON jobs(employer_id);
CREATE INDEX idx_job_assignments_job ON job_assignments(job_id);
CREATE INDEX idx_job_assignments_college ON job_assignments(college_id);
CREATE INDEX idx_applications_student ON applications(student_id);
CREATE INDEX idx_applications_job ON applications(job_id);
CREATE INDEX idx_audit_logs_actor ON audit_logs(actor_id);
CREATE INDEX idx_employer_college_access ON employer_college_access(employer_id, college_id);

-- ==========================================================
-- BASIC ROW LEVEL SECURITY (RLS) EXAMPLES
-- Note: A system this complex usually handles exact business logic in the Node.js backend
-- However, we must secure the tables via RLS so clients can't bypass the Node API directly.
-- ==========================================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE colleges ENABLE ROW LEVEL SECURITY;
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE employers ENABLE ROW LEVEL SECURITY;
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;

-- 1. Profiles: Users can read their own profile. Super Admins can read all.
CREATE POLICY "Users view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

-- 2. Colleges: Anyone logged in can see approved colleges.
CREATE POLICY "Public colleges are visible" ON colleges
  FOR SELECT USING (status = 'approved');

-- (Advanced RLS for multi-tenancy will be fully enforced via backend JWT claims and middleware)
