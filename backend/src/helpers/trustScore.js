/**
 * trustScore.js
 * Computes the aggregate trust score for a job based on weighted votes.
 *
 * Score formula:
 *   sentiment = sum(weight) for upvotes - sum(weight) for downvotes+reports
 *   total_weight = sum(all weights)
 *   trust_score = 50 + (sentiment / total_weight) * 50   → range [0, 100]
 *
 * Status thresholds (configurable via env):
 *   < TRUST_CRITICAL_THRESHOLD (default 25)  → restrict job + queue admin review
 *   < TRUST_WARNING_THRESHOLD  (default 40)  → flag job for admin attention
 */

const env = require('../config/env');

const WARNING_THRESHOLD  = env.trustWarningThreshold;
const CRITICAL_THRESHOLD = env.trustCriticalThreshold;

/**
 * Compute weighted trust score from a list of vote records.
 * @param {Array<{vote_type: string, weight: number}>} votes
 * @returns {{ score: number, totalWeight: number, upWeight: number, downWeight: number }}
 */
function computeTrustScore(votes) {
  if (!votes || votes.length === 0) {
    return { score: 50, totalWeight: 0, upWeight: 0, downWeight: 0 };
  }

  let upWeight = 0;
  let downWeight = 0;

  for (const vote of votes) {
    if (vote.vote_type === 'upvote') {
      upWeight += vote.weight;
    } else {
      downWeight += vote.weight;
    }
  }

  const totalWeight = upWeight + downWeight;
  const sentiment   = upWeight - downWeight;
  const score       = Math.max(0, Math.min(100, 50 + (sentiment / totalWeight) * 50));

  return {
    score: Number(score.toFixed(2)),
    totalWeight,
    upWeight,
    downWeight,
  };
}

/**
 * Determine what automated action (if any) should be taken based on trust score.
 * @param {number} score - 0 to 100
 * @param {number} totalWeight - total vote weight cast so far
 * @param {string} currentStatus - current job status
 * @returns {{ action: 'none'|'flag'|'restrict', newStatus: string|null, reason: string|null }}
 */
function evaluateTrustAction(score, totalWeight, currentStatus) {
  // Don't touch jobs already blocked or closed
  if (['blocked', 'closed', 'draft'].includes(currentStatus)) {
    return { action: 'none', newStatus: null, reason: null };
  }

  // Need at least a minimum weight before acting (avoid 1-vote misfire)
  const MIN_WEIGHT_TO_ACT = 5;
  if (totalWeight < MIN_WEIGHT_TO_ACT) {
    return { action: 'none', newStatus: null, reason: null };
  }

  if (score < CRITICAL_THRESHOLD) {
    return {
      action: 'restrict',
      newStatus: 'restricted',
      reason: `Job trust score dropped to ${score}% — automatically restricted pending admin review.`,
    };
  }

  if (score < WARNING_THRESHOLD && currentStatus === 'approved') {
    return {
      action: 'flag',
      newStatus: null, // Don't change status yet, just notify admin
      reason: `Job trust score is at ${score}% — flagged for admin attention.`,
    };
  }

  return { action: 'none', newStatus: null, reason: null };
}

module.exports = {
  computeTrustScore,
  evaluateTrustAction,
  WARNING_THRESHOLD,
  CRITICAL_THRESHOLD,
};
