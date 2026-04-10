-- =============================================================================
-- Migration 003: Job Workflow & Resume Integration
-- Adds require_resume and timeline to jobs
-- Adds resume_url and current_phase to applications
-- Run this in Supabase SQL Editor
-- =============================================================================

-- Add columns to jobs
ALTER TABLE jobs
  ADD COLUMN IF NOT EXISTS require_resume BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS timeline JSONB DEFAULT '[]'::jsonb;

-- Add columns to applications
ALTER TABLE applications
  ADD COLUMN IF NOT EXISTS resume_url TEXT,
  ADD COLUMN IF NOT EXISTS current_phase TEXT DEFAULT 'applied';

SELECT 'Migration 003 applied: Job timeline and resume schema ready.' AS result;
