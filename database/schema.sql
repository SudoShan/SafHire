-- ============================================
-- TrustHire Database Schema
-- Supabase PostgreSQL
-- ============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- 1. PROFILES (extends Supabase auth.users)
-- ============================================
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('student', 'employer', 'admin', 'alumni')),
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 2. STUDENT PROFILES
-- ============================================
CREATE TABLE student_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  cgpa NUMERIC(3,2) CHECK (cgpa >= 0 AND cgpa <= 10),
  skills TEXT[] DEFAULT '{}',
  resume_url TEXT,
  resume_parsed_skills TEXT[] DEFAULT '{}',
  university TEXT,
  graduation_year INTEGER,
  branch TEXT,
  bio TEXT,
  linkedin_url TEXT,
  github_url TEXT,
  is_alumni BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

-- ============================================
-- 3. EMPLOYER PROFILES
-- ============================================
CREATE TABLE employer_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  company_name TEXT NOT NULL,
  company_email TEXT NOT NULL,
  company_domain TEXT NOT NULL,
  domain_verified BOOLEAN DEFAULT FALSE,
  email_verified BOOLEAN DEFAULT FALSE,
  company_website TEXT,
  company_description TEXT,
  company_logo_url TEXT,
  industry TEXT,
  company_size TEXT CHECK (company_size IN ('1-10', '11-50', '51-200', '201-500', '500+')),
  credibility_score NUMERIC(5,2) DEFAULT 50.00,
  is_approved BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

-- ============================================
-- 4. JOBS
-- ============================================
CREATE TABLE jobs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employer_id UUID NOT NULL REFERENCES employer_profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  salary_min NUMERIC(12,2),
  salary_max NUMERIC(12,2),
  location TEXT,
  job_type TEXT CHECK (job_type IN ('full-time', 'part-time', 'internship', 'contract', 'remote')),
  requirements TEXT[] DEFAULT '{}',
  required_skills TEXT[] DEFAULT '{}',
  min_cgpa NUMERIC(3,2) DEFAULT 0,
  experience_level TEXT CHECK (experience_level IN ('entry', 'mid', 'senior')),
  application_deadline TIMESTAMPTZ,
  
  -- AI Scam Detection Fields
  scam_score NUMERIC(5,2) DEFAULT 0,
  risk_level TEXT DEFAULT 'low' CHECK (risk_level IN ('low', 'medium', 'high', 'critical')),
  ai_explanation TEXT,
  keyword_flags TEXT[] DEFAULT '{}',
  
  -- Status
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'under_review', 'rejected', 'closed', 'appealed')),
  appeal_message TEXT,
  appeal_status TEXT CHECK (appeal_status IN ('pending', 'approved', 'rejected')),
  
  -- Credibility
  upvotes INTEGER DEFAULT 0,
  downvotes INTEGER DEFAULT 0,
  credibility_score NUMERIC(5,2) DEFAULT 50.00,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 5. JOB APPLICATIONS
-- ============================================
CREATE TABLE job_applications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES student_profiles(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'applied' CHECK (status IN ('applied', 'shortlisted', 'interviewed', 'offered', 'rejected', 'withdrawn')),
  cover_letter TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(job_id, student_id)
);

-- ============================================
-- 6. JOB VOTES (Credibility System)
-- ============================================
CREATE TABLE job_votes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  vote_type TEXT NOT NULL CHECK (vote_type IN ('upvote', 'downvote')),
  weight INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(job_id, user_id)
);

-- ============================================
-- 7. DISCUSSIONS
-- ============================================
CREATE TABLE discussions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  parent_id UUID REFERENCES discussions(id) ON DELETE SET NULL,
  is_ai_summary BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 8. OTP VERIFICATION
-- ============================================
CREATE TABLE otp_verifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT NOT NULL,
  otp_code TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 9. AI PREPARATION HISTORY
-- ============================================
CREATE TABLE ai_preparations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  job_id UUID REFERENCES jobs(id) ON DELETE SET NULL,
  job_title TEXT NOT NULL,
  topics JSONB DEFAULT '[]',
  questions JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX idx_profiles_role ON profiles(role);
CREATE INDEX idx_student_profiles_user ON student_profiles(user_id);
CREATE INDEX idx_employer_profiles_user ON employer_profiles(user_id);
CREATE INDEX idx_jobs_employer ON jobs(employer_id);
CREATE INDEX idx_jobs_status ON jobs(status);
CREATE INDEX idx_jobs_scam_score ON jobs(scam_score);
CREATE INDEX idx_job_applications_job ON job_applications(job_id);
CREATE INDEX idx_job_applications_student ON job_applications(student_id);
CREATE INDEX idx_job_votes_job ON job_votes(job_id);
CREATE INDEX idx_discussions_job ON discussions(job_id);

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE employer_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE discussions ENABLE ROW LEVEL SECURITY;

-- Profiles: users can read all, update own
CREATE POLICY "Public profiles are viewable by everyone" ON profiles
  FOR SELECT USING (true);

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- Jobs: everyone can read active jobs
CREATE POLICY "Active jobs are viewable by everyone" ON jobs
  FOR SELECT USING (status = 'active' OR status = 'under_review');

CREATE POLICY "Employers can insert jobs" ON jobs
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM employer_profiles WHERE user_id = auth.uid() AND id = employer_id)
  );

CREATE POLICY "Employers can update own jobs" ON jobs
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM employer_profiles WHERE user_id = auth.uid() AND id = employer_id)
  );

-- ============================================
-- FUNCTIONS
-- ============================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_jobs_updated_at
  BEFORE UPDATE ON jobs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Function to calculate job credibility score
CREATE OR REPLACE FUNCTION calculate_job_credibility(job_uuid UUID)
RETURNS NUMERIC AS $$
DECLARE
  total_score NUMERIC := 0;
  total_weight NUMERIC := 0;
  vote RECORD;
BEGIN
  FOR vote IN
    SELECT jv.vote_type, jv.weight
    FROM job_votes jv
    WHERE jv.job_id = job_uuid
  LOOP
    IF vote.vote_type = 'upvote' THEN
      total_score := total_score + vote.weight;
    ELSE
      total_score := total_score - vote.weight;
    END IF;
    total_weight := total_weight + vote.weight;
  END LOOP;
  
  IF total_weight = 0 THEN
    RETURN 50.00;
  END IF;
  
  RETURN GREATEST(0, LEAST(100, 50 + (total_score::NUMERIC / total_weight) * 50));
END;
$$ LANGUAGE plpgsql;

-- Function to update employer credibility based on their jobs
CREATE OR REPLACE FUNCTION update_employer_credibility(emp_uuid UUID)
RETURNS VOID AS $$
DECLARE
  avg_score NUMERIC;
BEGIN
  SELECT AVG(credibility_score) INTO avg_score
  FROM jobs
  WHERE employer_id = emp_uuid;
  
  UPDATE employer_profiles
  SET credibility_score = COALESCE(avg_score, 50.00)
  WHERE id = emp_uuid;
END;
$$ LANGUAGE plpgsql;
