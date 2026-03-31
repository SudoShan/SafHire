const express = require('express');
const asyncHandler = require('../helpers/asyncHandler');
const { authenticate, optionalAuthenticate } = require('../middleware/authenticate');
const controller = require('../controllers/discussion.controller');

const router = express.Router();

router.get('/job/:jobId', optionalAuthenticate, asyncHandler(controller.getThread));
router.post('/job/:jobId/replies', authenticate, asyncHandler(controller.addReply));
router.post('/job/:jobId/summarize', authenticate, asyncHandler(controller.summarize));

module.exports = router;
