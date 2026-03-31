const express = require('express');
const asyncHandler = require('../helpers/asyncHandler');
const validate = require('../middleware/validate');
const { authenticate, authorize } = require('../middleware/authenticate');
const controller = require('../controllers/cdc.controller');
const { validateAssignment } = require('../validators/job.validators');
const { validateBatch, validateGroup } = require('../validators/cdc.validators');

const router = express.Router();

router.use(authenticate, authorize('cdc_admin'));

router.get('/dashboard', asyncHandler(controller.dashboard));
router.get('/students', asyncHandler(controller.listStudents));
router.get('/batches', asyncHandler(controller.listBatches));
router.post('/batches', validate(validateBatch), asyncHandler(controller.createBatch));
router.get('/groups', asyncHandler(controller.listGroups));
router.post('/groups', validate(validateGroup), asyncHandler(controller.createGroup));
router.post('/groups/:groupId/refresh-members', asyncHandler(controller.refreshGroupMembers));
router.get('/employer-requests', asyncHandler(controller.listEmployerRequests));
router.get('/jobs', asyncHandler(controller.listAssignableJobs));
router.patch('/employer-requests/:accessId', asyncHandler(controller.resolveEmployerRequest));
router.post('/jobs/:jobId/assignments', validate(validateAssignment), asyncHandler(controller.assignJob));

module.exports = router;
