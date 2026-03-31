const express = require('express');
const asyncHandler = require('../helpers/asyncHandler');
const { authenticate, authorize } = require('../middleware/authenticate');
const controller = require('../controllers/appeal.controller');

const router = express.Router();

router.get('/', authenticate, authorize('employer', 'super_admin'), asyncHandler(controller.listAppeals));
router.post('/', authenticate, authorize('employer'), asyncHandler(controller.createAppeal));
router.patch('/:appealId', authenticate, authorize('super_admin'), asyncHandler(controller.reviewAppeal));

module.exports = router;
