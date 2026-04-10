-- =============================================================================
-- Migration 001: Dynamic Trust System
-- Run this in Supabase SQL Editor AFTER the base schema has been applied.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Add `outcome` column to jobs
--    Tracks the verified final status of a job (set by Super Admin only).
--    NULL means not yet verified.
-- -----------------------------------------------------------------------------
ALTER TABLE jobs
  ADD COLUMN IF NOT EXISTS outcome TEXT
    CHECK (outcome IN ('confirmed_genuine', 'confirmed_scam'));

-- -----------------------------------------------------------------------------
-- 2. Create user_vote_stats table
--    Tracks accuracy metrics for each user to enable dynamic weight adjustment.
--    One row per user, upserted after outcome is finalized.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS user_vote_stats (
  user_id          UUID        PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  total_votes      INTEGER     NOT NULL DEFAULT 0 CHECK (total_votes >= 0),
  correct_votes    INTEGER     NOT NULL DEFAULT 0 CHECK (correct_votes >= 0),
  accuracy         NUMERIC(5,4) NOT NULL DEFAULT 0.5000
                     CHECK (accuracy >= 0 AND accuracy <= 1),
  weight_multiplier NUMERIC(4,2) NOT NULL DEFAULT 1.00
                     CHECK (weight_multiplier >= 0.25 AND weight_multiplier <= 3.00),
  last_computed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Trigger to auto-update updated_at
CREATE TRIGGER trg_user_vote_stats_updated_at
  BEFORE UPDATE ON user_vote_stats
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_user_vote_stats_user_id ON user_vote_stats(user_id);

-- -----------------------------------------------------------------------------
-- 3. RLS for user_vote_stats
-- -----------------------------------------------------------------------------
ALTER TABLE user_vote_stats ENABLE ROW LEVEL SECURITY;

-- Service role has full access
CREATE POLICY svc_user_vote_stats ON user_vote_stats
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Users can only read their own stats
CREATE POLICY user_vote_stats_read_own ON user_vote_stats
  FOR SELECT USING (user_id = auth.uid() OR is_super_admin());

-- Only service role (backend) can write stats — prevent client-side manipulation
-- (No INSERT/UPDATE/DELETE policies for authenticated role — backend uses service_role key)

-- -----------------------------------------------------------------------------
-- 4. Helper function: compute weight_multiplier from accuracy
--    - accuracy < 0.40 → 0.25 (penalized)
--    - accuracy 0.40–0.60 → 1.00 (neutral, insufficient data or average)
--    - accuracy 0.61–0.80 → 1.50 (trusted)
--    - accuracy > 0.80 → 2.50 (highly trusted)
--    - If total_votes < 10, keep multiplier at 1.00 (not enough data)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION compute_weight_multiplier(p_accuracy NUMERIC, p_total_votes INTEGER)
RETURNS NUMERIC LANGUAGE plpgsql IMMUTABLE AS $$
BEGIN
  IF p_total_votes < 10 THEN
    RETURN 1.00;
  END IF;

  IF p_accuracy < 0.40 THEN
    RETURN 0.25;
  ELSIF p_accuracy <= 0.60 THEN
    RETURN 1.00;
  ELSIF p_accuracy <= 0.80 THEN
    RETURN 1.50;
  ELSE
    RETURN 2.50;
  END IF;
END;
$$;

SELECT 'Migration 001 applied: Dynamic Trust System tables ready.' AS result;
