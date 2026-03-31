-- =============================================================================
-- TrustHire — Single Canonical Schema
-- Run this once in Supabase SQL Editor to set up the full database.
-- Safe to re-run: uses DROP IF EXISTS + CREATE IF NOT EXISTS patterns.
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================================================
-- CLEANUP (safe for dev resets — remove these DROP lines in production)
-- =============================================================================
DROP TABLE IF EXISTS audit_logs CASCADE;
DROP TABLE IF EXISTS appeals CASCADE;
DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS discussion_replies CASCADE;
DROP TABLE IF EXISTS discussions CASCADE;
DROP TABLE IF EXISTS votes CASCADE;
DROP TABLE IF EXISTS saved_jobs CASCADE;
DROP TABLE IF EXISTS applications CASCADE;
DROP TABLE IF EXISTS job_assignments CASCADE;
DROP TABLE IF EXISTS job_ai_reviews CASCADE;
DROP TABLE IF EXISTS jobs CASCADE;
DROP TABLE IF EXISTS employer_college_access CASCADE;
DROP TABLE IF EXISTS employer_verifications CASCADE;
DROP TABLE IF EXISTS employers CASCADE;
DROP TABLE IF EXISTS student_documents CASCADE;
DROP TABLE IF EXISTS group_membership CASCADE;
DROP TABLE IF EXISTS groups CASCADE;
DROP TABLE IF EXISTS students CASCADE;
DROP TABLE IF EXISTS batches CASCADE;
DROP TABLE IF EXISTS cdc_admins CASCADE;
DROP TABLE IF EXISTS colleges CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS roles CASCADE;

-- =============================================================================
-- ROLES
-- =============================================================================
CREATE TABLE roles (
  code        TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  description TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO roles (code, name, description) VALUES
  ('super_admin', 'Super Admin',  'Global platform administrator'),
  ('cdc_admin',   'CDC Admin',    'College placement administrator'),
  ('employer',    'Employer',     'Verified or pending employer account'),
  ('student',     'Student',      'Current student account'),
  ('alumni',      'Alumni',       'Former student account')
ON CONFLICT (code) DO NOTHING;

-- =============================================================================
-- USERS
-- =============================================================================
CREATE TABLE users (
  id            UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role_code     TEXT        NOT NULL REFERENCES roles(code),
  email         TEXT        NOT NULL UNIQUE,
  full_name     TEXT        NOT NULL,
  phone         TEXT,
  avatar_url    TEXT,
  college_email TEXT,
  is_active     BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- COLLEGES
-- =============================================================================
CREATE TABLE colleges (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  code        TEXT        NOT NULL UNIQUE,
  name        TEXT        NOT NULL UNIQUE,
  slug        TEXT        NOT NULL UNIQUE,
  domain      TEXT        NOT NULL UNIQUE,
  logo_url    TEXT,
  location    TEXT,
  status      TEXT        NOT NULL DEFAULT 'pending'
                CHECK (status IN ('pending','approved','blocked')),
  created_by  UUID        REFERENCES users(id),
  approved_by UUID        REFERENCES users(id),
  approved_at TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- CDC ADMINS
-- =============================================================================
CREATE TABLE cdc_admins (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  college_id  UUID        NOT NULL REFERENCES colleges(id) ON DELETE CASCADE,
  designation TEXT,
  status      TEXT        NOT NULL DEFAULT 'active'
                CHECK (status IN ('pending','active','blocked')),
  assigned_by UUID        REFERENCES users(id),
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- BATCHES
-- =============================================================================
CREATE TABLE batches (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  college_id      UUID        NOT NULL REFERENCES colleges(id) ON DELETE CASCADE,
  name            TEXT        NOT NULL,
  graduation_year INTEGER     NOT NULL,
  department      TEXT        NOT NULL,
  status          TEXT        NOT NULL DEFAULT 'active'
                    CHECK (status IN ('active','archived')),
  created_by      UUID        REFERENCES users(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (college_id, name)
);

-- =============================================================================
-- STUDENTS
-- =============================================================================
CREATE TABLE students (
  id                     UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                UUID           NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  college_id             UUID           NOT NULL REFERENCES colleges(id) ON DELETE CASCADE,
  batch_id               UUID           NOT NULL REFERENCES batches(id) ON DELETE RESTRICT,
  department             TEXT           NOT NULL,
  graduation_year        INTEGER        NOT NULL,
  enrollment_number      TEXT           NOT NULL,
  cgpa                   NUMERIC(4,2)   NOT NULL DEFAULT 0.00
                           CHECK (cgpa >= 0.00 AND cgpa <= 10.00),
  active_backlogs        INTEGER        NOT NULL DEFAULT 0 CHECK (active_backlogs >= 0),
  history_backlogs       INTEGER        NOT NULL DEFAULT 0 CHECK (history_backlogs >= 0),
  skills                 TEXT[]         NOT NULL DEFAULT '{}',
  parsed_resume_skills   TEXT[]         NOT NULL DEFAULT '{}',
  preferred_role         TEXT,
  resume_url             TEXT,
  linkedin_url           TEXT,
  github_url             TEXT,
  verification_status    TEXT           NOT NULL DEFAULT 'pending'
                           CHECK (verification_status IN ('pending','verified','rejected')),
  college_email_verified BOOLEAN        NOT NULL DEFAULT FALSE,
  marksheet_verified     BOOLEAN        NOT NULL DEFAULT FALSE,
  is_alumni              BOOLEAN        NOT NULL DEFAULT FALSE,
  created_at             TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
  updated_at             TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
  UNIQUE (college_id, enrollment_number)
);

-- =============================================================================
-- GROUPS + MEMBERSHIP
-- =============================================================================
CREATE TABLE groups (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  college_id UUID        NOT NULL REFERENCES colleges(id) ON DELETE CASCADE,
  name       TEXT        NOT NULL,
  description TEXT,
  criteria   JSONB       NOT NULL DEFAULT '{}'::JSONB,
  created_by UUID        REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (college_id, name)
);

CREATE TABLE group_membership (
  group_id   UUID        NOT NULL REFERENCES groups(id)   ON DELETE CASCADE,
  student_id UUID        NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  added_by   UUID        REFERENCES users(id),
  added_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (group_id, student_id)
);

-- =============================================================================
-- STUDENT DOCUMENTS
-- =============================================================================
CREATE TABLE student_documents (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id          UUID        NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  document_type       TEXT        NOT NULL
                        CHECK (document_type IN (
                          'college_id_card','semester_marksheet',
                          'degree_marksheet','resume','other'
                        )),
  storage_path        TEXT        NOT NULL,
  public_url          TEXT,
  verification_status TEXT        NOT NULL DEFAULT 'pending'
                        CHECK (verification_status IN ('pending','verified','rejected')),
  reviewed_by         UUID        REFERENCES users(id),
  reviewed_at         TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- EMPLOYERS
-- =============================================================================
CREATE TABLE employers (
  id                        UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                   UUID           NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  company_name              TEXT           NOT NULL,
  company_type              TEXT           NOT NULL
                              CHECK (company_type IN ('mnc','startup','agency','other')),
  official_email            TEXT           NOT NULL UNIQUE,
  company_domain            TEXT           NOT NULL,
  website                   TEXT,
  linkedin_url              TEXT,
  company_logo_url          TEXT,
  company_size              TEXT,
  registration_document_url TEXT,
  credibility_score         NUMERIC(5,2)   NOT NULL DEFAULT 50.00
                              CHECK (credibility_score >= 0 AND credibility_score <= 100),
  verification_status       TEXT           NOT NULL DEFAULT 'pending'
                              CHECK (verification_status IN ('pending','verified','blocked')),
  verified_by               UUID           REFERENCES users(id),
  verified_at               TIMESTAMPTZ,
  blocked_reason            TEXT,
  created_at                TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
  updated_at                TIMESTAMPTZ    NOT NULL DEFAULT NOW()
);

CREATE TABLE employer_verifications (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  employer_id       UUID        NOT NULL REFERENCES employers(id) ON DELETE CASCADE,
  verification_type TEXT        NOT NULL
                      CHECK (verification_type IN (
                        'domain_dns','domain_email','linkedin',
                        'website','registration_document','manual_review'
                      )),
  status            TEXT        NOT NULL DEFAULT 'pending'
                      CHECK (status IN ('pending','approved','rejected')),
  evidence          JSONB       NOT NULL DEFAULT '{}'::JSONB,
  reviewer_id       UUID        REFERENCES users(id),
  notes             TEXT,
  reviewed_at       TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE employer_college_access (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  employer_id  UUID        NOT NULL REFERENCES employers(id)  ON DELETE CASCADE,
  college_id   UUID        NOT NULL REFERENCES colleges(id)   ON DELETE CASCADE,
  status       TEXT        NOT NULL DEFAULT 'requested'
                 CHECK (status IN ('requested','approved','rejected','revoked')),
  requested_by UUID        REFERENCES users(id),
  requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_by  UUID        REFERENCES users(id),
  resolved_at  TIMESTAMPTZ,
  reason       TEXT,
  notes        TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (employer_id, college_id)
);

-- =============================================================================
-- JOBS + AI REVIEWS + ASSIGNMENTS
-- =============================================================================
CREATE TABLE jobs (
  id                  UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
  employer_id         UUID           NOT NULL REFERENCES employers(id) ON DELETE CASCADE,
  distribution_mode   TEXT           NOT NULL
                        CHECK (distribution_mode IN ('off_campus_public','campus_cdc')),
  title               TEXT           NOT NULL,
  role                TEXT           NOT NULL,
  description         TEXT           NOT NULL,
  location            TEXT,
  job_type            TEXT           NOT NULL
                        CHECK (job_type IN ('full_time','internship','part_time','contract','remote')),
  salary_min          NUMERIC(12,2),
  salary_max          NUMERIC(12,2),
  currency            TEXT           NOT NULL DEFAULT 'INR',
  eligibility_rules   JSONB          NOT NULL DEFAULT '{}'::JSONB,
  required_skills     TEXT[]         NOT NULL DEFAULT '{}',
  attachment_urls     TEXT[]         NOT NULL DEFAULT '{}',
  application_deadline TIMESTAMPTZ,
  status              TEXT           NOT NULL DEFAULT 'draft'
                        CHECK (status IN ('draft','under_review','approved','restricted','blocked','closed')),
  status_reason       TEXT,
  ai_screening_status TEXT           NOT NULL DEFAULT 'pending'
                        CHECK (ai_screening_status IN ('pending','reviewed','flagged')),
  published_at        TIMESTAMPTZ,
  created_at          TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ    NOT NULL DEFAULT NOW()
);

CREATE TABLE job_ai_reviews (
  id                  UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id              UUID           NOT NULL UNIQUE REFERENCES jobs(id) ON DELETE CASCADE,
  scam_score          NUMERIC(5,2)   NOT NULL DEFAULT 0
                        CHECK (scam_score >= 0 AND scam_score <= 100),
  risk_level          TEXT           NOT NULL DEFAULT 'low'
                        CHECK (risk_level IN ('low','medium','high')),
  explanation         TEXT,
  extracted_red_flags TEXT[]         NOT NULL DEFAULT '{}',
  role_match_quality  NUMERIC(5,2)
                        CHECK (role_match_quality IS NULL OR
                               (role_match_quality >= 0 AND role_match_quality <= 100)),
  classifier_version  TEXT,
  raw_payload         JSONB          NOT NULL DEFAULT '{}'::JSONB,
  reviewed_at         TIMESTAMPTZ    NOT NULL DEFAULT NOW()
);

CREATE TABLE job_assignments (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id           UUID        NOT NULL REFERENCES jobs(id)     ON DELETE CASCADE,
  college_id       UUID        NOT NULL REFERENCES colleges(id) ON DELETE CASCADE,
  batch_id         UUID        REFERENCES batches(id)  ON DELETE CASCADE,
  group_id         UUID        REFERENCES groups(id)   ON DELETE CASCADE,
  assigned_by      UUID        REFERENCES users(id),
  visibility_status TEXT       NOT NULL DEFAULT 'pending'
                     CHECK (visibility_status IN ('pending','approved','restricted','rejected')),
  override_reason  TEXT,
  internal_notes   TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE NULLS NOT DISTINCT (job_id, college_id, batch_id, group_id)
);

-- =============================================================================
-- APPLICATIONS + SAVED JOBS + VOTES
-- =============================================================================
CREATE TABLE applications (
  id             UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id         UUID           NOT NULL REFERENCES jobs(id)     ON DELETE CASCADE,
  student_id     UUID           NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  status         TEXT           NOT NULL DEFAULT 'applied'
                   CHECK (status IN (
                     'applied','screening','shortlisted',
                     'interviewing','offered','rejected','withdrawn'
                   )),
  ai_match_score NUMERIC(5,2)
                   CHECK (ai_match_score IS NULL OR
                          (ai_match_score >= 0 AND ai_match_score <= 100)),
  cover_letter   TEXT,
  applied_at     TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
  UNIQUE (job_id, student_id)
);

CREATE TABLE saved_jobs (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID        NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  job_id     UUID        NOT NULL REFERENCES jobs(id)     ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (student_id, job_id)
);

CREATE TABLE votes (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id     UUID        NOT NULL REFERENCES jobs(id)   ON DELETE CASCADE,
  user_id    UUID        NOT NULL REFERENCES users(id)  ON DELETE CASCADE,
  vote_type  TEXT        NOT NULL
               CHECK (vote_type IN ('upvote','downvote','report_scam')),
  weight     INTEGER     NOT NULL DEFAULT 1 CHECK (weight >= 1),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (job_id, user_id)
);

-- =============================================================================
-- DISCUSSIONS + REPLIES
-- =============================================================================
CREATE TABLE discussions (
  id                 UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id             UUID        NOT NULL REFERENCES jobs(id)     ON DELETE CASCADE,
  college_id         UUID        REFERENCES colleges(id) ON DELETE CASCADE,
  scope              TEXT        NOT NULL CHECK (scope IN ('global','college')),
  title              TEXT        NOT NULL DEFAULT 'Discussion',
  ai_summary         JSONB       NOT NULL DEFAULT '{}'::JSONB,
  last_summarized_at TIMESTAMPTZ,
  created_by         UUID        REFERENCES users(id),
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE NULLS NOT DISTINCT (job_id, college_id)
);

CREATE TABLE discussion_replies (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  discussion_id     UUID        NOT NULL REFERENCES discussions(id)      ON DELETE CASCADE,
  user_id           UUID        NOT NULL REFERENCES users(id)            ON DELETE CASCADE,
  parent_reply_id   UUID        REFERENCES discussion_replies(id)        ON DELETE CASCADE,
  body              TEXT        NOT NULL,
  reactions         JSONB       NOT NULL DEFAULT '{}'::JSONB,
  report_count      INTEGER     NOT NULL DEFAULT 0 CHECK (report_count >= 0),
  moderation_status TEXT        NOT NULL DEFAULT 'visible'
                      CHECK (moderation_status IN ('visible','hidden','flagged')),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- NOTIFICATIONS + APPEALS + AUDIT LOGS
-- =============================================================================
CREATE TABLE notifications (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type       TEXT        NOT NULL,
  title      TEXT        NOT NULL,
  message    TEXT        NOT NULL,
  data       JSONB       NOT NULL DEFAULT '{}'::JSONB,
  read_at    TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE appeals (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id           UUID        NOT NULL REFERENCES jobs(id)      ON DELETE CASCADE,
  employer_id      UUID        NOT NULL REFERENCES employers(id) ON DELETE CASCADE,
  submitted_by     UUID        NOT NULL REFERENCES users(id)     ON DELETE CASCADE,
  reason           TEXT        NOT NULL,
  status           TEXT        NOT NULL DEFAULT 'pending'
                     CHECK (status IN ('pending','approved','rejected')),
  resolution_notes TEXT,
  resolved_by      UUID        REFERENCES users(id),
  resolved_at      TIMESTAMPTZ,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE audit_logs (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id    UUID        REFERENCES users(id),
  college_id  UUID        REFERENCES colleges(id),
  action      TEXT        NOT NULL,
  entity_type TEXT        NOT NULL,
  entity_id   UUID,
  metadata    JSONB       NOT NULL DEFAULT '{}'::JSONB,
  ip_address  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- INDEXES
-- =============================================================================
CREATE INDEX idx_users_role_code                      ON users(role_code);
CREATE INDEX idx_colleges_status                      ON colleges(status);
CREATE INDEX idx_cdc_admins_college_id                ON cdc_admins(college_id);
CREATE INDEX idx_batches_college_id                   ON batches(college_id);
CREATE INDEX idx_students_college_id                  ON students(college_id);
CREATE INDEX idx_students_batch_id                    ON students(batch_id);
CREATE INDEX idx_students_verification_status         ON students(verification_status);
CREATE INDEX idx_groups_college_id                    ON groups(college_id);
CREATE INDEX idx_group_membership_student_id          ON group_membership(student_id);
CREATE INDEX idx_employers_verification_status        ON employers(verification_status);
CREATE INDEX idx_employer_access_college_status       ON employer_college_access(college_id, status);
CREATE INDEX idx_jobs_employer_id                     ON jobs(employer_id);
CREATE INDEX idx_jobs_status                          ON jobs(status);
CREATE INDEX idx_jobs_distribution_mode               ON jobs(distribution_mode);
CREATE INDEX idx_job_assignments_job_id               ON job_assignments(job_id);
CREATE INDEX idx_job_assignments_college_id           ON job_assignments(college_id);
CREATE INDEX idx_job_assignments_visibility_status    ON job_assignments(visibility_status);
CREATE INDEX idx_applications_student_id              ON applications(student_id);
CREATE INDEX idx_applications_job_id                  ON applications(job_id);
CREATE INDEX idx_saved_jobs_student_id                ON saved_jobs(student_id);
CREATE INDEX idx_votes_job_id                         ON votes(job_id);
CREATE INDEX idx_discussions_job_id                   ON discussions(job_id);
CREATE INDEX idx_discussion_replies_discussion_id     ON discussion_replies(discussion_id);
CREATE INDEX idx_notifications_user_id                ON notifications(user_id);
CREATE INDEX idx_appeals_employer_id                  ON appeals(employer_id);
CREATE INDEX idx_appeals_job_id                       ON appeals(job_id);
CREATE INDEX idx_audit_logs_actor_id                  ON audit_logs(actor_id);
CREATE INDEX idx_audit_logs_entity                    ON audit_logs(entity_type, entity_id);

-- =============================================================================
-- UTILITY FUNCTIONS
-- =============================================================================
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION current_role_code()
RETURNS TEXT LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT role_code FROM public.users WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION is_super_admin()
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE(current_role_code() = 'super_admin', FALSE);
$$;

CREATE OR REPLACE FUNCTION current_college_id()
RETURNS UUID LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE(
    (SELECT college_id FROM public.cdc_admins WHERE user_id = auth.uid() LIMIT 1),
    (SELECT college_id FROM public.students   WHERE user_id = auth.uid() LIMIT 1)
  );
$$;

CREATE OR REPLACE FUNCTION current_student_id()
RETURNS UUID LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT id FROM public.students WHERE user_id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION current_student_batch_id()
RETURNS UUID LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT batch_id FROM public.students WHERE user_id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION is_cdc_admin_for_college(target_college_id UUID)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.cdc_admins
    WHERE user_id = auth.uid()
      AND college_id = target_college_id
      AND status = 'active'
  );
$$;

CREATE OR REPLACE FUNCTION is_job_owner(target_job_id UUID)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.jobs j
    JOIN public.employers e ON e.id = j.employer_id
    WHERE j.id = target_job_id AND e.user_id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION can_view_job(target_job_id UUID)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  WITH student_ctx AS (
    SELECT s.id AS student_id, s.college_id, s.batch_id
    FROM public.students s WHERE s.user_id = auth.uid()
  )
  SELECT EXISTS (
    SELECT 1 FROM public.jobs j WHERE j.id = target_job_id AND (
      is_super_admin()
      OR is_job_owner(target_job_id)
      OR (current_role_code() IN ('student','alumni')
          AND j.status = 'approved'
          AND j.distribution_mode = 'off_campus_public')
      OR (current_role_code() = 'cdc_admin'
          AND EXISTS (
            SELECT 1 FROM public.job_assignments ja
            WHERE ja.job_id = j.id AND ja.college_id = current_college_id()
          ))
      OR (current_role_code() IN ('student','alumni')
          AND j.status IN ('approved','restricted')
          AND j.distribution_mode = 'campus_cdc'
          AND EXISTS (
            SELECT 1 FROM student_ctx s
            JOIN public.job_assignments ja ON ja.job_id = j.id
            WHERE ja.visibility_status IN ('approved','restricted')
              AND ja.college_id = s.college_id
              AND (ja.batch_id IS NULL OR ja.batch_id = s.batch_id)
              AND (ja.group_id IS NULL OR EXISTS (
                SELECT 1 FROM public.group_membership gm
                WHERE gm.group_id = ja.group_id AND gm.student_id = s.student_id
              ))
          ))
    )
  );
$$;

-- =============================================================================
-- TRIGGERS
-- =============================================================================
CREATE TRIGGER trg_users_updated_at              BEFORE UPDATE ON users              FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_colleges_updated_at           BEFORE UPDATE ON colleges           FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_cdc_admins_updated_at         BEFORE UPDATE ON cdc_admins         FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_batches_updated_at            BEFORE UPDATE ON batches            FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_students_updated_at           BEFORE UPDATE ON students           FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_groups_updated_at             BEFORE UPDATE ON groups             FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_student_documents_updated_at  BEFORE UPDATE ON student_documents  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_employers_updated_at          BEFORE UPDATE ON employers          FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_employer_verifications_updated_at BEFORE UPDATE ON employer_verifications FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_employer_access_updated_at    BEFORE UPDATE ON employer_college_access FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_jobs_updated_at               BEFORE UPDATE ON jobs               FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_job_assignments_updated_at    BEFORE UPDATE ON job_assignments     FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_applications_updated_at       BEFORE UPDATE ON applications        FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_discussions_updated_at        BEFORE UPDATE ON discussions         FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_discussion_replies_updated_at BEFORE UPDATE ON discussion_replies  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_appeals_updated_at            BEFORE UPDATE ON appeals             FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- =============================================================================
-- ROW LEVEL SECURITY
-- =============================================================================
ALTER TABLE roles                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE users                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE colleges                ENABLE ROW LEVEL SECURITY;
ALTER TABLE cdc_admins              ENABLE ROW LEVEL SECURITY;
ALTER TABLE batches                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE students                ENABLE ROW LEVEL SECURITY;
ALTER TABLE groups                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_membership        ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_documents       ENABLE ROW LEVEL SECURITY;
ALTER TABLE employers               ENABLE ROW LEVEL SECURITY;
ALTER TABLE employer_verifications  ENABLE ROW LEVEL SECURITY;
ALTER TABLE employer_college_access ENABLE ROW LEVEL SECURITY;
ALTER TABLE jobs                    ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_ai_reviews          ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_assignments         ENABLE ROW LEVEL SECURITY;
ALTER TABLE applications            ENABLE ROW LEVEL SECURITY;
ALTER TABLE saved_jobs              ENABLE ROW LEVEL SECURITY;
ALTER TABLE votes                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE discussions             ENABLE ROW LEVEL SECURITY;
ALTER TABLE discussion_replies      ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications           ENABLE ROW LEVEL SECURITY;
ALTER TABLE appeals                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs              ENABLE ROW LEVEL SECURITY;

-- Service role bypass (backend uses service_role key — full access)
CREATE POLICY svc_roles                   ON roles                   FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY svc_users                   ON users                   FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY svc_colleges                ON colleges                FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY svc_cdc_admins              ON cdc_admins              FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY svc_batches                 ON batches                 FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY svc_students                ON students                FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY svc_groups                  ON groups                  FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY svc_group_membership        ON group_membership        FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY svc_student_documents       ON student_documents       FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY svc_employers               ON employers               FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY svc_employer_verifications  ON employer_verifications  FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY svc_employer_access         ON employer_college_access FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY svc_jobs                    ON jobs                    FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY svc_job_ai_reviews          ON job_ai_reviews          FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY svc_job_assignments         ON job_assignments         FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY svc_applications            ON applications            FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY svc_saved_jobs              ON saved_jobs              FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY svc_votes                   ON votes                   FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY svc_discussions             ON discussions             FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY svc_discussion_replies      ON discussion_replies      FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY svc_notifications           ON notifications           FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY svc_appeals                 ON appeals                 FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY svc_audit_logs              ON audit_logs              FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Authenticated user policies (anon key / frontend direct queries)
CREATE POLICY roles_read ON roles FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY users_read ON users FOR SELECT USING (
  auth.uid() = id OR is_super_admin() OR (
    current_role_code() = 'cdc_admin' AND EXISTS (
      SELECT 1 FROM students s WHERE s.user_id = users.id AND s.college_id = current_college_id()
    )
  )
);
CREATE POLICY users_insert ON users FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY users_update ON users FOR UPDATE
  USING (auth.uid() = id OR is_super_admin())
  WITH CHECK (auth.uid() = id OR is_super_admin());

CREATE POLICY colleges_read ON colleges FOR SELECT
  USING (status = 'approved' OR is_super_admin() OR is_cdc_admin_for_college(id));
CREATE POLICY colleges_write ON colleges FOR ALL
  USING (is_super_admin()) WITH CHECK (is_super_admin());

CREATE POLICY cdc_admins_read ON cdc_admins FOR SELECT
  USING (user_id = auth.uid() OR is_super_admin());
CREATE POLICY cdc_admins_write ON cdc_admins FOR ALL
  USING (is_super_admin()) WITH CHECK (is_super_admin());

CREATE POLICY batches_read ON batches FOR SELECT USING (
  is_super_admin() OR is_cdc_admin_for_college(college_id) OR (
    current_role_code() IN ('student','alumni') AND id = current_student_batch_id()
  )
);
CREATE POLICY batches_write ON batches FOR ALL
  USING (is_super_admin() OR is_cdc_admin_for_college(college_id))
  WITH CHECK (is_super_admin() OR is_cdc_admin_for_college(college_id));

CREATE POLICY students_read ON students FOR SELECT USING (
  user_id = auth.uid() OR is_super_admin() OR is_cdc_admin_for_college(college_id)
);
CREATE POLICY students_insert ON students FOR INSERT
  WITH CHECK (user_id = auth.uid() AND current_role_code() IN ('student','alumni'));
CREATE POLICY students_update ON students FOR UPDATE
  USING (user_id = auth.uid() OR is_super_admin() OR is_cdc_admin_for_college(college_id))
  WITH CHECK (user_id = auth.uid() OR is_super_admin() OR is_cdc_admin_for_college(college_id));

CREATE POLICY groups_read ON groups FOR SELECT USING (
  is_super_admin() OR is_cdc_admin_for_college(college_id) OR (
    current_role_code() IN ('student','alumni') AND EXISTS (
      SELECT 1 FROM group_membership gm JOIN students s ON s.id = gm.student_id
      WHERE gm.group_id = groups.id AND s.user_id = auth.uid()
    )
  )
);
CREATE POLICY groups_write ON groups FOR ALL
  USING (is_super_admin() OR is_cdc_admin_for_college(college_id))
  WITH CHECK (is_super_admin() OR is_cdc_admin_for_college(college_id));

CREATE POLICY group_membership_read ON group_membership FOR SELECT USING (
  is_super_admin() OR EXISTS (
    SELECT 1 FROM students s JOIN groups g ON g.id = group_membership.group_id
    WHERE s.id = group_membership.student_id
      AND (s.user_id = auth.uid() OR is_cdc_admin_for_college(g.college_id))
  )
);
CREATE POLICY group_membership_write ON group_membership FOR ALL
  USING (is_super_admin() OR EXISTS (
    SELECT 1 FROM groups g WHERE g.id = group_membership.group_id
      AND is_cdc_admin_for_college(g.college_id)
  ))
  WITH CHECK (is_super_admin() OR EXISTS (
    SELECT 1 FROM groups g WHERE g.id = group_membership.group_id
      AND is_cdc_admin_for_college(g.college_id)
  ));

CREATE POLICY employers_read ON employers FOR SELECT USING (
  user_id = auth.uid() OR is_super_admin() OR current_role_code() = 'cdc_admin'
);
CREATE POLICY employers_insert ON employers FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY employers_update ON employers FOR UPDATE
  USING (user_id = auth.uid() OR is_super_admin())
  WITH CHECK (user_id = auth.uid() OR is_super_admin());

CREATE POLICY jobs_read ON jobs FOR SELECT USING (
  is_super_admin() OR is_job_owner(id) OR
  (status = 'approved' AND distribution_mode = 'off_campus_public') OR
  can_view_job(id)
);
CREATE POLICY jobs_insert ON jobs FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM employers e WHERE e.id = employer_id AND e.user_id = auth.uid()));
CREATE POLICY jobs_update ON jobs FOR UPDATE
  USING (is_super_admin() OR is_job_owner(id))
  WITH CHECK (is_super_admin() OR is_job_owner(id));

CREATE POLICY job_ai_reviews_read ON job_ai_reviews FOR SELECT USING (can_view_job(job_id));

CREATE POLICY job_assignments_read ON job_assignments FOR SELECT USING (
  is_super_admin() OR is_cdc_admin_for_college(college_id) OR can_view_job(job_id)
);
CREATE POLICY job_assignments_write ON job_assignments FOR ALL
  USING (is_super_admin() OR is_cdc_admin_for_college(college_id))
  WITH CHECK (is_super_admin() OR is_cdc_admin_for_college(college_id));

CREATE POLICY applications_read ON applications FOR SELECT USING (
  is_super_admin() OR is_job_owner(job_id) OR
  EXISTS (SELECT 1 FROM students s WHERE s.id = student_id AND s.user_id = auth.uid()) OR
  (current_role_code() = 'cdc_admin' AND EXISTS (
    SELECT 1 FROM students s WHERE s.id = student_id AND s.college_id = current_college_id()
  ))
);
CREATE POLICY applications_insert ON applications FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM students s WHERE s.id = student_id AND s.user_id = auth.uid()));
CREATE POLICY applications_update ON applications FOR UPDATE
  USING (is_super_admin() OR is_job_owner(job_id) OR (
    current_role_code() = 'cdc_admin' AND EXISTS (
      SELECT 1 FROM students s WHERE s.id = student_id AND s.college_id = current_college_id()
    )
  ));

CREATE POLICY saved_jobs_own ON saved_jobs FOR ALL
  USING (EXISTS (SELECT 1 FROM students s WHERE s.id = student_id AND s.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM students s WHERE s.id = student_id AND s.user_id = auth.uid()));

CREATE POLICY votes_read ON votes FOR SELECT USING (can_view_job(job_id));
CREATE POLICY votes_write ON votes FOR ALL
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY discussions_read ON discussions FOR SELECT USING (can_view_job(job_id));

CREATE POLICY discussion_replies_read ON discussion_replies FOR SELECT USING (
  EXISTS (SELECT 1 FROM discussions d WHERE d.id = discussion_id AND can_view_job(d.job_id))
);
CREATE POLICY discussion_replies_insert ON discussion_replies FOR INSERT
  WITH CHECK (user_id = auth.uid() AND EXISTS (
    SELECT 1 FROM discussions d WHERE d.id = discussion_id AND can_view_job(d.job_id)
  ));

CREATE POLICY notifications_own ON notifications FOR ALL
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY appeals_read ON appeals FOR SELECT USING (
  is_super_admin() OR submitted_by = auth.uid()
);
CREATE POLICY appeals_insert ON appeals FOR INSERT WITH CHECK (submitted_by = auth.uid());
CREATE POLICY appeals_update ON appeals FOR UPDATE USING (is_super_admin());

CREATE POLICY audit_logs_read ON audit_logs FOR SELECT USING (is_super_admin());

SELECT 'TrustHire schema ready.' AS result;
