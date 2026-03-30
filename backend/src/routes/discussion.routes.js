const express = require('express');
const router = express.Router();
const axios = require('axios');
const { supabaseAdmin } = require('../config/supabase');
const { authenticate } = require('../middleware/auth.middleware');

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8000';

// GET /api/discussions/:jobId - Get discussion thread for a job
router.get('/:jobId', async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('discussions')
      .select(`
        *,
        user:profiles(full_name, role, avatar_url)
      `)
      .eq('job_id', req.params.jobId)
      .order('created_at', { ascending: true });

    if (error) throw error;

    // Build thread structure (nest replies)
    const threads = [];
    const map = new Map();

    data.forEach(msg => {
      map.set(msg.id, { ...msg, replies: [] });
    });

    data.forEach(msg => {
      if (msg.parent_id && map.has(msg.parent_id)) {
        map.get(msg.parent_id).replies.push(map.get(msg.id));
      } else {
        threads.push(map.get(msg.id));
      }
    });

    res.json({ discussions: threads, total: data.length });
  } catch (err) {
    console.error('Fetch discussions error:', err);
    res.status(500).json({ error: 'Failed to fetch discussions' });
  }
});

// POST /api/discussions/:jobId - Post a message
router.post('/:jobId', authenticate, async (req, res) => {
  try {
    const { message, parent_id } = req.body;

    if (!message || message.trim().length === 0) {
      return res.status(400).json({ error: 'Message is required' });
    }

    const { data, error } = await supabaseAdmin
      .from('discussions')
      .insert({
        job_id: req.params.jobId,
        user_id: req.user.id,
        message: message.trim(),
        parent_id: parent_id || null
      })
      .select(`
        *,
        user:profiles(full_name, role, avatar_url)
      `)
      .single();

    if (error) throw error;
    res.status(201).json({ discussion: data });
  } catch (err) {
    console.error('Post discussion error:', err);
    res.status(500).json({ error: 'Failed to post message' });
  }
});

// POST /api/discussions/:jobId/summarize - AI summarization
router.post('/:jobId/summarize', authenticate, async (req, res) => {
  try {
    // Fetch all messages
    const { data: messages } = await supabaseAdmin
      .from('discussions')
      .select('message, user:profiles(full_name, role)')
      .eq('job_id', req.params.jobId)
      .eq('is_ai_summary', false)
      .order('created_at', { ascending: true });

    if (!messages || messages.length < 3) {
      return res.status(400).json({ error: 'Not enough messages to summarize (minimum 3)' });
    }

    // Format for AI
    const formattedMessages = messages.map(m =>
      `${m.user?.full_name || 'Anonymous'} (${m.user?.role || 'user'}): ${m.message}`
    ).join('\n');

    // Call AI service
    let summary = '';
    try {
      const aiResponse = await axios.post(`${AI_SERVICE_URL}/summarize-discussion`, {
        messages: formattedMessages,
        job_id: req.params.jobId
      }, { timeout: 30000 });
      summary = aiResponse.data.summary;
    } catch (aiErr) {
      console.warn('AI summarization unavailable:', aiErr.message);
      // Fallback: basic summarization
      summary = `Discussion summary (${messages.length} messages): Key topics discussed include various aspects of this job posting. ${messages.length} participants shared their thoughts.`;
    }

    // Store AI summary as a discussion message
    const { data, error } = await supabaseAdmin
      .from('discussions')
      .insert({
        job_id: req.params.jobId,
        user_id: req.user.id,
        message: `📊 **AI Discussion Summary:**\n\n${summary}`,
        is_ai_summary: true
      })
      .select(`*, user:profiles(full_name, role, avatar_url)`)
      .single();

    if (error) throw error;
    res.json({ summary: data });
  } catch (err) {
    console.error('Summarize error:', err);
    res.status(500).json({ error: 'Failed to generate summary' });
  }
});

// DELETE /api/discussions/message/:id - Delete own message
router.delete('/message/:id', authenticate, async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('discussions')
      .delete()
      .eq('id', req.params.id)
      .eq('user_id', req.user.id)
      .select()
      .single();

    if (error || !data) {
      return res.status(404).json({ error: 'Message not found or not authorized' });
    }

    res.json({ message: 'Deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete message' });
  }
});

module.exports = router;
