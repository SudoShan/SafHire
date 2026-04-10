const express = require('express');
const asyncHandler = require('../helpers/asyncHandler');
const validate = require('../middleware/validate');
const { authenticate, authorize } = require('../middleware/authenticate');
const controller = require('../controllers/cdc.controller');
const { validateAssignment } = require('../validators/job.validators');
const { validateBatch, validateGroup } = require('../validators/cdc.validators');
const { validateInvitation } = require('../validators/job.validators');

const router = express.Router();

router.use(authenticate, authorize('cdc_admin'));

router.get('/dashboard', asyncHandler(controller.dashboard));
router.get('/students', asyncHandler(controller.listStudents));
router.get('/batches', asyncHandler(controller.listBatches));
router.get('/batches/:batchId/students', asyncHandler(controller.listBatchStudents));
router.get('/batches/:batchId/jobs', asyncHandler(controller.listBatchJobs));
router.post('/batches', validate(validateBatch), asyncHandler(controller.createBatch));
router.get('/groups', asyncHandler(controller.listGroups));
router.post('/groups', validate(validateGroup), asyncHandler(controller.createGroup));
router.post('/groups/:groupId/refresh-members', asyncHandler(controller.refreshGroupMembers));
router.get('/employer-requests', asyncHandler(controller.listEmployerRequests));
router.patch('/employer-requests/:accessId', asyncHandler(controller.resolveEmployerRequest));

// Legacy manual assignment route (kept for backward compat)
router.get('/jobs', asyncHandler(controller.listAssignableJobs));
router.post('/jobs/:jobId/assignments', validate(validateAssignment), asyncHandler(controller.assignJob));

// Invitations
router.get('/invitations', asyncHandler(controller.listInvitations));
router.post('/invitations', validate(validateInvitation), asyncHandler(controller.inviteStudent));
router.delete('/invitations/:invitationId', asyncHandler(controller.revokeInvitation));

// Incoming campus job requests from employers
router.get('/incoming-jobs', asyncHandler(controller.listIncomingJobRequests));
router.patch('/incoming-jobs/:assignmentId', asyncHandler(controller.reviewJobRequest));

module.exports = router;
