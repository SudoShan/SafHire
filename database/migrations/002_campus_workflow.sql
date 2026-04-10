-- =============================================================================
-- Migration 002: Campus Workflow
-- Adds student_invitations table for CDC admin invite-by-email workflow.
-- Run this in Supabase SQL Editor AFTER 001_dynamic_trust_system.sql.
-- =============================================================================

-- Create student_invitations table
CREATE TABLE IF NOT EXISTS student_invitations (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  college_id  UUID        NOT NULL REFERENCES colleges(id) ON DELETE CASCADE,
  batch_id    UUID        REFERENCES batches(id) ON DELETE SET NULL,
  email       TEXT        NOT NULL,
  invited_by  UUID        NOT NULL REFERENCES users(id),
  status      TEXT        NOT NULL DEFAULT 'pending'
                CHECK (status IN ('pending','accepted','expired','revoked')),
  accepted_at TIMESTAMPTZ,
  token       TEXT        NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  expires_at  TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_student_invitations_college_id ON student_invitations(college_id);
CREATE INDEX IF NOT EXISTS idx_student_invitations_email      ON student_invitations(email);
CREATE INDEX IF NOT EXISTS idx_student_invitations_status     ON student_invitations(status);

-- Trigger to keep updated_at current
CREATE TRIGGER trg_student_invitations_updated_at
  BEFORE UPDATE ON student_invitations
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─── RLS ────────────────────────────────────────────────────────────────────
ALTER TABLE student_invitations ENABLE ROW LEVEL SECURITY;

-- Backend service role: full access
CREATE POLICY svc_student_invitations ON student_invitations
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- CDC admin can see invitations they created for their college
CREATE POLICY cdc_student_invitations_read ON student_invitations
  FOR SELECT USING (is_cdc_admin_for_college(college_id));

-- Students can see their own invitations by email
CREATE POLICY student_invitation_read ON student_invitations
  FOR SELECT USING (
    email = (SELECT email FROM public.users WHERE id = auth.uid())
  );

SELECT 'Migration 002: student_invitations table created.' AS result;
