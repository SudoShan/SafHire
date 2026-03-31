const express = require('express');
const asyncHandler = require('../helpers/asyncHandler');
const validate = require('../middleware/validate');
const { authenticate, authorize } = require('../middleware/authenticate');
const controller = require('../controllers/employer.controller');
const { validateCollegeAccessRequest, validateEmployerProfile } = require('../validators/employer.validators');

const router = express.Router();

router.use(authenticate, authorize('employer'));

router.get('/profile', asyncHandler(controller.getProfile));
router.post('/profile', validate(validateEmployerProfile), asyncHandler(controller.upsertProfile));
router.get('/colleges', asyncHandler(controller.listCollegeAccess));
router.post('/request-access', validate(validateCollegeAccessRequest), asyncHandler(controller.requestCollegeAccess));
router.post('/verify-domain', asyncHandler(controller.verifyDomain));
router.get('/my-jobs', asyncHandler(controller.listMyJobs));

module.exports = router;
