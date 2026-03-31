const express = require('express');

const authRoutes = require('./auth.routes');
const studentRoutes = require('./student.routes');
const employerRoutes = require('./employer.routes');
const jobRoutes = require('./job.routes');
const cdcRoutes = require('./cdc.routes');
const superAdminRoutes = require('./superAdmin.routes');
const discussionRoutes = require('./discussion.routes');
const voteRoutes = require('./vote.routes');
const credibilityRoutes = require('./credibility.routes');
const aiRoutes = require('./ai.routes');
const notificationRoutes = require('./notification.routes');
const appealRoutes = require('./appeal.routes');
const analyticsRoutes = require('./analytics.routes');

const router = express.Router();

router.use('/auth', authRoutes);
router.use('/students', studentRoutes);
router.use('/employers', employerRoutes);
router.use('/jobs', jobRoutes);
router.use('/cdc', cdcRoutes);
router.use('/super-admin', superAdminRoutes);
router.use('/discussions', discussionRoutes);
router.use('/votes', voteRoutes);
router.use('/credibility', credibilityRoutes);
router.use('/ai', aiRoutes);
router.use('/notifications', notificationRoutes);
router.use('/appeals', appealRoutes);
router.use('/analytics', analyticsRoutes);

module.exports = router;
