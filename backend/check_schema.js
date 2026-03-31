const { serviceClient } = require('./src/config/supabase');

(async () => {
  const checks = [
    ['students', 'batch_id'],
    ['students', 'is_alumni'],
    ['students', 'parsed_resume_skills'],
    ['students', 'verification_status'],
    ['students', 'college_email_verified'],
    ['jobs', 'distribution_mode'],
    ['jobs', 'status'],
    ['jobs', 'ai_screening_status'],
    ['jobs', 'role'],
    ['jobs', 'published_at'],
    ['employers', 'official_email'],
    ['employers', 'company_type'],
    ['employers', 'credibility_score'],
    ['employers', 'company_domain'],
    ['employers', 'company_description'],
    ['discussions', 'scope'],
    ['discussions', 'ai_summary'],
  ];

  for (const [tbl, col] of checks) {
    const r = await serviceClient.from(tbl).select(col).limit(1);
    console.log(`${tbl}.${col}: ${r.error ? '❌ MISSING (' + r.error.message + ')' : '✅ OK'}`);
  }

  // Check table existence
  const tables = ['discussion_replies', 'job_ai_reviews', 'job_assignments', 'saved_jobs', 'votes', 'appeals', 'audit_logs', 'notifications'];
  for (const t of tables) {
    const r = await serviceClient.from(t).select('id').limit(1);
    console.log(`TABLE ${t}: ${r.error ? '❌ ' + r.error.message : '✅ exists'}`);
  }
})();
