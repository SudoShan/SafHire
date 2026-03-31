const express = require('express');
const asyncHandler = require('../helpers/asyncHandler');
const validate = require('../middleware/validate');
const { authenticate, authorize, optionalAuthenticate } = require('../middleware/authenticate');
const controller = require('../controllers/job.controller');
const { validateApplication, validateJob } = require('../validators/job.validators');

const router = express.Router();

// Public job listing
router.get('/', asyncHandler(controller.listJobs));

// Application status update — must come BEFORE /:jobId to avoid route conflict
router.patch(
  '/applications/:applicationId/status',
  authenticate,
  authorize('employer', 'cdc_admin', 'super_admin'),
  asyncHandler(controller.updateApplicationStatus),
);

// Job status update (super admin / CDC override)
router.patch(
  '/:jobId/status',
  authenticate,
  authorize('super_admin', 'cdc_admin'),
  asyncHandler(controller.updateJobStatus),
);

// Job detail — optional auth so public users can preview
router.get('/:jobId', optionalAuthenticate, asyncHandler(controller.getJob));

// Create job
router.post('/', authenticate, authorize('employer'), validate(validateJob), asyncHandler(controller.createJob));

// Apply to job
router.post('/:jobId/apply', authenticate, authorize('student', 'alumni'), validate(validateApplication), asyncHandler(controller.apply));

// Get applicants for a job
router.get('/:jobId/applicants', authenticate, authorize('employer', 'cdc_admin', 'super_admin'), asyncHandler(controller.getApplicants));

module.exports = router;
