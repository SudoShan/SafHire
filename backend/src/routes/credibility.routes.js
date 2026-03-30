const express = require('express');
const router = express.Router();
const { supabaseAdmin } = require('../config/supabase');
const { authenticate } = require('../middleware/auth.middleware');

// Vote weight map
const VOTE_WEIGHTS = {
  student: 1,
  alumni: 2,
  admin: 5,
  employer: 1
};

// POST /api/credibility/vote/:jobId - Upvote or downvote a job
router.post('/vote/:jobId', authenticate, async (req, res) => {
  try {
    const { vote_type } = req.body;

    if (!['upvote', 'downvote'].includes(vote_type)) {
      return res.status(400).json({ error: 'vote_type must be "upvote" or "downvote"' });
    }

    const userRole = req.user.profile.role;
    const weight = VOTE_WEIGHTS[userRole] || 1;

    // Check existing vote
    const { data: existingVote } = await supabaseAdmin
      .from('job_votes')
      .select('*')
      .eq('job_id', req.params.jobId)
      .eq('user_id', req.user.id)
      .single();

    if (existingVote) {
      if (existingVote.vote_type === vote_type) {
        // Remove vote (toggle off)
        await supabaseAdmin
          .from('job_votes')
          .delete()
          .eq('id', existingVote.id);
      } else {
        // Change vote
        await supabaseAdmin
          .from('job_votes')
          .update({ vote_type, weight })
          .eq('id', existingVote.id);
      }
    } else {
      // New vote
      await supabaseAdmin
        .from('job_votes')
        .insert({
          job_id: req.params.jobId,
          user_id: req.user.id,
          vote_type,
          weight
        });
    }

    // Recalculate job credibility
    const { data: votes } = await supabaseAdmin
      .from('job_votes')
      .select('vote_type, weight')
      .eq('job_id', req.params.jobId);

    let upvoteScore = 0;
    let downvoteScore = 0;
    let totalWeight = 0;

    votes.forEach(v => {
      if (v.vote_type === 'upvote') upvoteScore += v.weight;
      else downvoteScore += v.weight;
      totalWeight += v.weight;
    });

    const credibilityScore = totalWeight === 0
      ? 50
      : Math.max(0, Math.min(100, 50 + ((upvoteScore - downvoteScore) / totalWeight) * 50));

    // Update job credibility
    await supabaseAdmin
      .from('jobs')
      .update({
        credibility_score: credibilityScore,
        upvotes: votes.filter(v => v.vote_type === 'upvote').length,
        downvotes: votes.filter(v => v.vote_type === 'downvote').length
      })
      .eq('id', req.params.jobId);

    // Update employer credibility (average of all their jobs)
    const { data: job } = await supabaseAdmin
      .from('jobs')
      .select('employer_id')
      .eq('id', req.params.jobId)
      .single();

    if (job) {
      const { data: employerJobs } = await supabaseAdmin
        .from('jobs')
        .select('credibility_score')
        .eq('employer_id', job.employer_id);

      const avgScore = employerJobs.reduce((sum, j) => sum + (j.credibility_score || 50), 0) / employerJobs.length;

      await supabaseAdmin
        .from('employer_profiles')
        .update({ credibility_score: avgScore })
        .eq('id', job.employer_id);
    }

    res.json({
      credibility_score: credibilityScore,
      upvotes: votes.filter(v => v.vote_type === 'upvote').length,
      downvotes: votes.filter(v => v.vote_type === 'downvote').length,
      user_vote: existingVote?.vote_type === vote_type ? null : vote_type
    });
  } catch (err) {
    console.error('Vote error:', err);
    res.status(500).json({ error: 'Failed to process vote' });
  }
});

// GET /api/credibility/vote/:jobId - Get vote status
router.get('/vote/:jobId', authenticate, async (req, res) => {
  try {
    const { data: userVote } = await supabaseAdmin
      .from('job_votes')
      .select('vote_type')
      .eq('job_id', req.params.jobId)
      .eq('user_id', req.user.id)
      .single();

    const { data: job } = await supabaseAdmin
      .from('jobs')
      .select('credibility_score, upvotes, downvotes')
      .eq('id', req.params.jobId)
      .single();

    res.json({
      user_vote: userVote?.vote_type || null,
      credibility_score: job?.credibility_score || 50,
      upvotes: job?.upvotes || 0,
      downvotes: job?.downvotes || 0
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch vote status' });
  }
});

module.exports = router;
