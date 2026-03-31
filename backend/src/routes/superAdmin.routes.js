const express = require('express');
const asyncHandler = require('../helpers/asyncHandler');
const { authenticate, authorize } = require('../middleware/authenticate');
const controller = require('../controllers/superAdmin.controller');

const router = express.Router();

router.use(authenticate, authorize('super_admin'));

router.get('/colleges', asyncHandler(controller.listColleges));
router.post('/colleges', asyncHandler(controller.createCollege));
router.patch('/colleges/:collegeId/status', asyncHandler(controller.updateCollegeStatus));
router.post('/cdc-admins', asyncHandler(controller.provisionCdcAdmin));
router.get('/employers', asyncHandler(controller.listEmployers));
router.patch('/employers/:employerId/status', asyncHandler(controller.updateEmployerStatus));
router.get('/flagged-jobs', asyncHandler(controller.listFlaggedJobs));
router.get('/users', asyncHandler(controller.listUsers));

module.exports = router;
