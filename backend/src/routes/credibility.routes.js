// credibility.routes.js — thin wrapper, delegates to vote.service via vote.routes
// This file is kept for backward compatibility but the canonical vote endpoints
// are at /api/votes/jobs/:jobId (GET + POST)
const express = require('express');
const asyncHandler = require('../helpers/asyncHandler');
const { authenticate } = require('../middleware/authenticate');
const controller = require('../controllers/vote.controller');

const router = express.Router();

router.use(authenticate);

// Alias routes matching the old credibility path pattern
router.get('/vote/:jobId', asyncHandler(controller.getVoteStatus));
router.post('/vote/:jobId', asyncHandler(controller.castVote));

module.exports = router;
