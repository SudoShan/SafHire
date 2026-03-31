const analyticsService = require('../services/analytics.service');

async function studentAnalytics(req, res) {
  const analytics = await analyticsService.getStudentAnalytics(req.user.id);
  res.json(analytics);
}

async function cdcAnalytics(req, res) {
  const analytics = await analyticsService.getCdcAnalytics(req.user.id);
  res.json(analytics);
}

async function platformAnalytics(_req, res) {
  const analytics = await analyticsService.getPlatformAnalytics();
  res.json(analytics);
}

module.exports = {
  cdcAnalytics,
  platformAnalytics,
  studentAnalytics,
};
