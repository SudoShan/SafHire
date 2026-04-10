/**
 * userStats.js
 * Handles reading and updating the user_vote_stats table.
 * Used by the outcome finalization flow to reward/penalize voters.
 */

const { serviceClient } = require('../config/supabase');

/**
 * Fetch a single user's vote stats. Returns default values if no row exists yet.
 * @param {string} userId
 * @returns {Object}
 */
async function getUserVoteStats(userId) {
  const { data } = await serviceClient
    .from('user_vote_stats')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  return data || {
    user_id: userId,
    total_votes: 0,
    correct_votes: 0,
    accuracy: 0.5,
    weight_multiplier: 1.0,
  };
}

/**
 * Compute the weight_multiplier from accuracy and total_votes.
 * Mirrors the DB function `compute_weight_multiplier` for use in JS.
 * @param {number} accuracy - 0 to 1
 * @param {number} totalVotes
 * @returns {number}
 */
function computeWeightMultiplier(accuracy, totalVotes) {
  if (totalVotes < 10) return 1.0;
  if (accuracy < 0.4) return 0.25;
  if (accuracy <= 0.6) return 1.0;
  if (accuracy <= 0.8) return 1.5;
  return 2.5;
}

/**
 * Increment a user's vote stats after a job outcome is finalized.
 * @param {string} userId
 * @param {boolean} wasCorrect - true if the user's vote matched the final outcome
 */
async function recordVoteOutcome(userId, wasCorrect) {
  const current = await getUserVoteStats(userId);

  const newTotal = current.total_votes + 1;
  const newCorrect = current.correct_votes + (wasCorrect ? 1 : 0);
  const newAccuracy = newTotal > 0 ? newCorrect / newTotal : 0.5;
  const newMultiplier = computeWeightMultiplier(newAccuracy, newTotal);

  await serviceClient
    .from('user_vote_stats')
    .upsert({
      user_id: userId,
      total_votes: newTotal,
      correct_votes: newCorrect,
      accuracy: Number(newAccuracy.toFixed(4)),
      weight_multiplier: newMultiplier,
      last_computed_at: new Date().toISOString(),
    }, { onConflict: 'user_id' });
}

/**
 * Fetch the weight_multiplier for a given user. Defaults to 1.0 if user has no stats row.
 * @param {string} userId
 * @returns {Promise<number>}
 */
async function getWeightMultiplier(userId) {
  const { data } = await serviceClient
    .from('user_vote_stats')
    .select('weight_multiplier')
    .eq('user_id', userId)
    .maybeSingle();

  return data?.weight_multiplier ?? 1.0;
}

module.exports = {
  computeWeightMultiplier,
  getWeightMultiplier,
  getUserVoteStats,
  recordVoteOutcome,
};
