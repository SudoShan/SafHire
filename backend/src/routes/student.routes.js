const express = require('express');
const multer = require('multer');
const asyncHandler = require('../helpers/asyncHandler');
const validate = require('../middleware/validate');
const { authenticate, authorize } = require('../middleware/authenticate');
const controller = require('../controllers/student.controller');
const { validateStudentProfile } = require('../validators/student.validators');

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

router.get('/colleges', asyncHandler(controller.listColleges));
router.get('/profile', authenticate, authorize('student', 'alumni'), asyncHandler(controller.getProfile));
router.post('/profile', authenticate, authorize('student', 'alumni'), validate(validateStudentProfile), asyncHandler(controller.updateProfile));
router.post('/resume', authenticate, authorize('student', 'alumni'), upload.single('resume'), asyncHandler(controller.uploadResume));
router.get('/feed', authenticate, authorize('student', 'alumni'), asyncHandler(controller.getFeed));
router.get('/saved-jobs', authenticate, authorize('student', 'alumni'), asyncHandler(controller.getSavedJobs));
router.post('/saved-jobs/:jobId/toggle', authenticate, authorize('student', 'alumni'), asyncHandler(controller.toggleSavedJob));
router.get('/applications', authenticate, authorize('student', 'alumni'), asyncHandler(controller.getApplications));

module.exports = router;
