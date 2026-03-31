const express = require('express');
const asyncHandler = require('../helpers/asyncHandler');
const { authenticate, authorize } = require('../middleware/authenticate');
const controller = require('../controllers/analytics.controller');

const router = express.Router();

router.get('/student', authenticate, authorize('student', 'alumni'), asyncHandler(controller.studentAnalytics));
router.get('/cdc', authenticate, authorize('cdc_admin'), asyncHandler(controller.cdcAnalytics));
router.get('/platform', authenticate, authorize('super_admin'), asyncHandler(controller.platformAnalytics));

module.exports = router;
