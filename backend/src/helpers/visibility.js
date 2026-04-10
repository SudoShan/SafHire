/**
 * visibility.js
 * Provides voting weight calculation with role-based base weights
 * multiplied by a dynamic accuracy-based multiplier from user_vote_stats.
 */

const { getWeightMultiplier } = require('./userStats');

/**
 * Base weight by role. These are the starting influence levels.
 */
const BASE_WEIGHTS = {
  super_admin: 5,
  cdc_admin: 4,
  alumni: 2,
  student: 1,
};

/**
 * Get the base weight for a role (synchronous, no DB call).
 * Used when we don't need the dynamic multiplier (e.g., initial seed).
 * @param {string} roleCode
 * @returns {number}
 */
function getBaseWeight(roleCode) {
  return BASE_WEIGHTS[roleCode] ?? 1;
}

/**
 * Get the effective voting weight for a user, incorporating their
 * accuracy-based multiplier from user_vote_stats.
 *
 * Effective weight = base_weight * weight_multiplier
 * Clamped to: min 1, max 15
 *
 * @param {string} roleCode
 * @param {string} userId
 * @returns {Promise<number>}
 */
async function getVoteWeight(roleCode, userId) {
  const base = getBaseWeight(roleCode);

  if (!userId) {
    return base;
  }

  const multiplier = await getWeightMultiplier(userId);
  const effective  = base * multiplier;

  // Clamp: minimum 1 so even penalized users still count a little.
  // Maximum 15 so no single voter is overwhelmingly dominant.
  return Math.max(1, Math.min(15, Math.round(effective)));
}

module.exports = {
  BASE_WEIGHTS,
  getBaseWeight,
  getVoteWeight,
};
