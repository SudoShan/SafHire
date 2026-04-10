const express = require('express');
const asyncHandler = require('../helpers/asyncHandler');
const { authenticate } = require('../middleware/authenticate');
const controller = require('../controllers/vote.controller');

const router = express.Router();

router.use(authenticate);

// Vote stats for the current user (trust score, accuracy, effective weight)
router.get('/me/stats', asyncHandler(controller.getMyVoteStats));

// Vote on a job
router.get('/jobs/:jobId', asyncHandler(controller.getVoteStatus));
router.post('/jobs/:jobId', asyncHandler(controller.castVote));

module.exports = router;

