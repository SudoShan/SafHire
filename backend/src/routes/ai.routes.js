const express = require('express');
const asyncHandler = require('../helpers/asyncHandler');
const { authenticate, authorize } = require('../middleware/authenticate');
const controller = require('../controllers/ai.controller');

const router = express.Router();

router.use(authenticate);

router.post('/analyze-job', authorize('employer', 'cdc_admin', 'super_admin'), asyncHandler(controller.analyzeJob));
router.post('/match-job', authorize('student', 'alumni'), asyncHandler(controller.matchJob));
router.post('/generate-prep', authorize('student', 'alumni'), asyncHandler(controller.generatePrep));

module.exports = router;
