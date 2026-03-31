const express = require('express');
const asyncHandler = require('../helpers/asyncHandler');
const { authenticate } = require('../middleware/authenticate');
const controller = require('../controllers/notification.controller');

const router = express.Router();

router.use(authenticate);
router.get('/', asyncHandler(controller.listNotifications));
router.patch('/:notificationId/read', asyncHandler(controller.markAsRead));

module.exports = router;
