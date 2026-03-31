-- =============================================================================
-- TrustHire Demo Seed
-- Run after database/schema.sql
-- =============================================================================

CREATE OR REPLACE FUNCTION seed_auth_user(
  p_id UUID,
  p_email TEXT,
  p_password TEXT,
  p_metadata JSONB DEFAULT '{}'::JSONB
)
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
    confirmation_token,
    email_change,
    email_change_token_new,
    recovery_token
  )
  VALUES (
    '00000000-0000-0000-0000-000000000000',
    p_id,
    'authenticated',
    'authenticated',
    p_email,
    crypt(p_password, gen_salt('bf')),
    NOW(),
    jsonb_build_object('provider', 'email', 'providers', ARRAY['email']),
    p_metadata,
    NOW(),
    NOW(),
    '',
    '',
    '',
    ''
  )
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO auth.identities (
    id,
    user_id,
    identity_data,
    provider,
    provider_id,
    created_at,
    updated_at
  )
  VALUES (
    gen_random_uuid(),
    p_id,
    jsonb_build_object('sub', p_id::TEXT, 'email', p_email),
    'email',
    p_id::TEXT,
    NOW(),
    NOW()
  )
  ON CONFLICT (provider, provider_id) DO NOTHING;
END;
$$;

SELECT seed_auth_user('00000000-0000-0000-0000-000000000001', 'admin@trusthire.dev', 'TrustHire@123', '{"full_name":"TrustHire Super Admin"}');
SELECT seed_auth_user('00000000-0000-0000-0000-000000000002', 'cdc.alpha@alpha.edu', 'TrustHire@123', '{"full_name":"Asha Raman"}');
SELECT seed_auth_user('00000000-0000-0000-0000-000000000003', 'cdc.beta@beta.edu', 'TrustHire@123', '{"full_name":"Kiran Das"}');
SELECT seed_auth_user('00000000-0000-0000-0000-000000000004', 'student1@alpha.edu', 'TrustHire@123', '{"full_name":"Neha Iyer"}');
SELECT seed_auth_user('00000000-0000-0000-0000-000000000005', 'student1@beta.edu', 'TrustHire@123', '{"full_name":"Rahul Menon"}');
SELECT seed_auth_user('00000000-0000-0000-0000-000000000006', 'alumni@alpha.edu', 'TrustHire@123', '{"full_name":"Priya Krishnan"}');
SELECT seed_auth_user('00000000-0000-0000-0000-000000000007', 'recruiter@acme.com', 'TrustHire@123', '{"full_name":"Rohan Kapoor"}');
SELECT seed_auth_user('00000000-0000-0000-0000-000000000008', 'founder@novalabs.ai', 'TrustHire@123', '{"full_name":"Maya Sethi"}');

INSERT INTO users (id, role_code, email, full_name, college_email)
VALUES
  ('00000000-0000-0000-0000-000000000001', 'super_admin', 'admin@trusthire.dev', 'TrustHire Super Admin', NULL),
  ('00000000-0000-0000-0000-000000000002', 'cdc_admin', 'cdc.alpha@alpha.edu', 'Asha Raman', 'cdc.alpha@alpha.edu'),
  ('00000000-0000-0000-0000-000000000003', 'cdc_admin', 'cdc.beta@beta.edu', 'Kiran Das', 'cdc.beta@beta.edu'),
  ('00000000-0000-0000-0000-000000000004', 'student', 'student1@alpha.edu', 'Neha Iyer', 'student1@alpha.edu'),
  ('00000000-0000-0000-0000-000000000005', 'student', 'student1@beta.edu', 'Rahul Menon', 'student1@beta.edu'),
  ('00000000-0000-0000-0000-000000000006', 'alumni', 'alumni@alpha.edu', 'Priya Krishnan', 'alumni@alpha.edu'),
  ('00000000-0000-0000-0000-000000000007', 'employer', 'recruiter@acme.com', 'Rohan Kapoor', NULL),
  ('00000000-0000-0000-0000-000000000008', 'employer', 'founder@novalabs.ai', 'Maya Sethi', NULL)
ON CONFLICT (id) DO NOTHING;

INSERT INTO colleges (id, code, name, slug, domain, location, status, created_by, approved_by, approved_at)
VALUES
  ('10000000-0000-0000-0000-000000000001', 'ALPHA', 'Alpha Institute of Technology', 'alpha-institute', 'alpha.edu', 'Chennai', 'approved', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', NOW()),
  ('10000000-0000-0000-0000-000000000002', 'BETA', 'Beta University', 'beta-university', 'beta.edu', 'Bengaluru', 'approved', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO cdc_admins (id, user_id, college_id, designation, status, assigned_by)
VALUES
  ('20000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', 'Placement Officer', 'active', '00000000-0000-0000-0000-000000000001'),
  ('20000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000002', 'Training and Placement Head', 'active', '00000000-0000-0000-0000-000000000001')
ON CONFLICT (id) DO NOTHING;

INSERT INTO batches (id, college_id, name, graduation_year, department, created_by)
VALUES
  ('30000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', '2026 Computer Science', 2026, 'Computer Science', '00000000-0000-0000-0000-000000000002'),
  ('30000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', '2025 Information Technology', 2025, 'Information Technology', '00000000-0000-0000-0000-000000000002'),
  ('30000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000002', '2026 Data Science', 2026, 'Data Science', '00000000-0000-0000-0000-000000000003')
ON CONFLICT (id) DO NOTHING;

INSERT INTO students (
  id, user_id, college_id, batch_id, department, graduation_year,
  enrollment_number, cgpa, active_backlogs, history_backlogs,
  skills, parsed_resume_skills, preferred_role, resume_url,
  verification_status, college_email_verified, marksheet_verified, is_alumni
)
VALUES
  (
    '40000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000004',
    '10000000-0000-0000-0000-000000000001',
    '30000000-0000-0000-0000-000000000001',
    'Computer Science',
    2026,
    'AIT-CS-2026-021',
    8.72,
    0,
    0,
    ARRAY['React', 'Node.js', 'SQL', 'Tailwind CSS'],
    ARRAY['React', 'Node.js', 'SQL', 'Tailwind CSS'],
    'Frontend Engineer',
    'https://example.com/resumes/neha-iyer.pdf',
    'verified',
    TRUE,
    TRUE,
    FALSE
  ),
  (
    '40000000-0000-0000-0000-000000000002',
    '00000000-0000-0000-0000-000000000005',
    '10000000-0000-0000-0000-000000000002',
    '30000000-0000-0000-0000-000000000003',
    'Data Science',
    2026,
    'BU-DS-2026-011',
    8.10,
    1,
    1,
    ARRAY['Python', 'Pandas', 'Machine Learning', 'SQL'],
    ARRAY['Python', 'Pandas', 'Machine Learning', 'SQL'],
    'Data Analyst',
    'https://example.com/resumes/rahul-menon.pdf',
    'verified',
    TRUE,
    TRUE,
    FALSE
  ),
  (
    '40000000-0000-0000-0000-000000000003',
    '00000000-0000-0000-0000-000000000006',
    '10000000-0000-0000-0000-000000000001',
    '30000000-0000-0000-0000-000000000002',
    'Information Technology',
    2025,
    'AIT-IT-2025-004',
    8.95,
    0,
    0,
    ARRAY['Java', 'Spring Boot', 'PostgreSQL', 'AWS'],
    ARRAY['Java', 'Spring Boot', 'PostgreSQL', 'AWS'],
    'Backend Engineer',
    'https://example.com/resumes/priya-krishnan.pdf',
    'verified',
    TRUE,
    TRUE,
    TRUE
  )
ON CONFLICT (id) DO NOTHING;

INSERT INTO student_documents (student_id, document_type, storage_path, public_url, verification_status, reviewed_by, reviewed_at)
VALUES
  ('40000000-0000-0000-0000-000000000001', 'semester_marksheet', 'student-docs/neha/semester6.pdf', 'https://example.com/docs/neha-sem6.pdf', 'verified', '00000000-0000-0000-0000-000000000002', NOW()),
  ('40000000-0000-0000-0000-000000000002', 'college_id_card', 'student-docs/rahul/id.pdf', 'https://example.com/docs/rahul-id.pdf', 'verified', '00000000-0000-0000-0000-000000000003', NOW())
ON CONFLICT DO NOTHING;

INSERT INTO groups (id, college_id, name, description, criteria, created_by)
VALUES
  (
    '50000000-0000-0000-0000-000000000001',
    '10000000-0000-0000-0000-000000000001',
    'Alpha High CGPA Frontend',
    'Students with strong frontend skills and CGPA above 8.5',
    '{"department":"Computer Science","min_cgpa":8.5,"max_backlogs":0,"required_skills":["React","Tailwind CSS"],"graduation_year":2026}'::jsonb,
    '00000000-0000-0000-0000-000000000002'
  )
ON CONFLICT (id) DO NOTHING;

INSERT INTO group_membership (group_id, student_id, added_by)
VALUES
  ('50000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002')
ON CONFLICT DO NOTHING;

INSERT INTO employers (
  id, user_id, company_name, company_type, official_email, company_domain,
  website, linkedin_url, company_logo_url, company_size, registration_document_url,
  credibility_score, verification_status, verified_by, verified_at
)
VALUES
  (
    '60000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000007',
    'Acme Digital',
    'mnc',
    'recruiter@acme.com',
    'acme.com',
    'https://acme.com',
    'https://linkedin.com/company/acme-digital',
    'https://example.com/logos/acme.svg',
    '1000+',
    'https://example.com/docs/acme-incorporation.pdf',
    82.50,
    'verified',
    '00000000-0000-0000-0000-000000000001',
    NOW()
  ),
  (
    '60000000-0000-0000-0000-000000000002',
    '00000000-0000-0000-0000-000000000008',
    'Nova Labs',
    'startup',
    'founder@novalabs.ai',
    'novalabs.ai',
    'https://novalabs.ai',
    'https://linkedin.com/company/nova-labs-ai',
    'https://example.com/logos/novalabs.svg',
    '11-50',
    'https://example.com/docs/novalabs-registration.pdf',
    56.00,
    'pending',
    NULL,
    NULL
  )
ON CONFLICT (id) DO NOTHING;

INSERT INTO employer_verifications (employer_id, verification_type, status, evidence, reviewer_id, notes, reviewed_at)
VALUES
  ('60000000-0000-0000-0000-000000000001', 'domain_dns', 'approved', '{"mx":true,"a_record":true}'::jsonb, '00000000-0000-0000-0000-000000000001', 'Corporate domain verified.', NOW()),
  ('60000000-0000-0000-0000-000000000001', 'domain_email', 'approved', '{"official_email":"recruiter@acme.com"}'::jsonb, '00000000-0000-0000-0000-000000000001', 'Official domain mailbox verified.', NOW()),
  ('60000000-0000-0000-0000-000000000002', 'linkedin', 'pending', '{"linkedin_url":"https://linkedin.com/company/nova-labs-ai"}'::jsonb, NULL, 'Awaiting manual review.', NULL)
ON CONFLICT DO NOTHING;

INSERT INTO employer_college_access (id, employer_id, college_id, status, requested_by, requested_at, resolved_by, resolved_at, reason, notes)
VALUES
  ('70000000-0000-0000-0000-000000000001', '60000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'approved', '00000000-0000-0000-0000-000000000007', NOW(), '00000000-0000-0000-0000-000000000002', NOW(), 'Campus hiring request approved.', 'Alpha CDC approved Acme Digital.'),
  ('70000000-0000-0000-0000-000000000002', '60000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', 'requested', '00000000-0000-0000-0000-000000000008', NOW(), NULL, NULL, 'Looking to hire AI interns.', 'Awaiting CDC review.')
ON CONFLICT (id) DO NOTHING;

INSERT INTO jobs (
  id, employer_id, distribution_mode, title, role, description, location,
  job_type, salary_min, salary_max, eligibility_rules, required_skills,
  attachment_urls, application_deadline, status, status_reason, ai_screening_status,
  published_at
)
VALUES
  (
    '80000000-0000-0000-0000-000000000001',
    '60000000-0000-0000-0000-000000000001',
    'off_campus_public',
    'Frontend Engineer Intern',
    'Frontend Engineer',
    'Build responsive product experiences using React, Tailwind CSS, and modern APIs. This opportunity is open across the TrustHire network.',
    'Remote',
    'internship',
    35000,
    45000,
    '{"min_cgpa":7.0,"max_backlogs":1,"graduation_years":[2025,2026]}'::jsonb,
    ARRAY['React', 'JavaScript', 'Tailwind CSS'],
    ARRAY['https://example.com/attachments/frontend-brief.pdf'],
    NOW() + INTERVAL '10 days',
    'approved',
    'AI cleared and published as a public off-campus role.',
    'reviewed',
    NOW()
  ),
  (
    '80000000-0000-0000-0000-000000000002',
    '60000000-0000-0000-0000-000000000001',
    'campus_cdc',
    'Alpha Campus Software Analyst',
    'Software Analyst',
    'Exclusive Alpha Institute campus drive for software analyst trainees with strong communication and problem-solving skills.',
    'Chennai',
    'full_time',
    650000,
    850000,
    '{"min_cgpa":8.0,"max_backlogs":0,"departments":["Computer Science","Information Technology"],"graduation_years":[2025,2026]}'::jsonb,
    ARRAY['SQL', 'Communication', 'Problem Solving'],
    ARRAY[]::text[],
    NOW() + INTERVAL '7 days',
    'approved',
    'Approved for campus routing.',
    'reviewed',
    NOW()
  ),
  (
    '80000000-0000-0000-0000-000000000003',
    '60000000-0000-0000-0000-000000000002',
    'campus_cdc',
    'Urgent AI Research Fellowship',
    'AI Research Intern',
    'Immediate joining. Limited seats. Complete your registration payment to receive the final interview calendar.',
    'Remote',
    'internship',
    90000,
    120000,
    '{"min_cgpa":7.5}'::jsonb,
    ARRAY['Python', 'Machine Learning'],
    ARRAY[]::text[],
    NOW() + INTERVAL '3 days',
    'blocked',
    'Blocked after scam detection review.',
    'flagged',
    NULL
  )
ON CONFLICT (id) DO NOTHING;

INSERT INTO job_ai_reviews (
  job_id, scam_score, risk_level, explanation, extracted_red_flags,
  role_match_quality, classifier_version, raw_payload
)
VALUES
  (
    '80000000-0000-0000-0000-000000000001',
    8.00,
    'low',
    'Low-risk public job from a verified employer with normal compensation and complete company details.',
    ARRAY[]::text[],
    88.00,
    'trusthire-scam-hybrid-v1',
    '{"rule_hits":[],"ml_probability":0.08}'::jsonb
  ),
  (
    '80000000-0000-0000-0000-000000000002',
    14.00,
    'low',
    'Campus role from a verified employer. No payment requests or suspicious instructions detected.',
    ARRAY[]::text[],
    76.00,
    'trusthire-scam-hybrid-v1',
    '{"rule_hits":[],"ml_probability":0.14}'::jsonb
  ),
  (
    '80000000-0000-0000-0000-000000000003',
    91.00,
    'high',
    'High-risk posting due to registration payment request, urgency language, and incomplete trust signals.',
    ARRAY['registration fee', 'fake urgency', 'payment before interview'],
    61.00,
    'trusthire-scam-hybrid-v1',
    '{"rule_hits":["registration fee","urgency"],"ml_probability":0.91}'::jsonb
  )
ON CONFLICT (job_id) DO NOTHING;

INSERT INTO job_assignments (id, job_id, college_id, batch_id, group_id, assigned_by, visibility_status, internal_notes)
VALUES
  (
    '90000000-0000-0000-0000-000000000001',
    '80000000-0000-0000-0000-000000000002',
    '10000000-0000-0000-0000-000000000001',
    '30000000-0000-0000-0000-000000000001',
    NULL,
    '00000000-0000-0000-0000-000000000002',
    'approved',
    'Approved for Alpha 2026 CS batch.'
  ),
  (
    '90000000-0000-0000-0000-000000000002',
    '80000000-0000-0000-0000-000000000002',
    '10000000-0000-0000-0000-000000000001',
    NULL,
    '50000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000002',
    'restricted',
    'High-priority shortlist group only.'
  )
ON CONFLICT (id) DO NOTHING;

INSERT INTO applications (job_id, student_id, status, ai_match_score, cover_letter, applied_at)
VALUES
  ('80000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000001', 'applied', 87.00, 'Excited to contribute to frontend systems and UI polish.', NOW() - INTERVAL '1 day'),
  ('80000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000002', 'screening', 79.00, 'Interested in transitioning analytics skills into product engineering.', NOW() - INTERVAL '12 hours'),
  ('80000000-0000-0000-0000-000000000002', '40000000-0000-0000-0000-000000000001', 'shortlisted', 84.00, 'Strong fit for the Alpha campus analyst role.', NOW() - INTERVAL '6 hours')
ON CONFLICT (job_id, student_id) DO NOTHING;

INSERT INTO saved_jobs (student_id, job_id)
VALUES
  ('40000000-0000-0000-0000-000000000001', '80000000-0000-0000-0000-000000000001'),
  ('40000000-0000-0000-0000-000000000002', '80000000-0000-0000-0000-000000000001')
ON CONFLICT (student_id, job_id) DO NOTHING;

INSERT INTO votes (job_id, user_id, vote_type, weight)
VALUES
  ('80000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000004', 'upvote', 1),
  ('80000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000006', 'upvote', 2),
  ('80000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000002', 'report_scam', 5)
ON CONFLICT (job_id, user_id) DO NOTHING;

INSERT INTO discussions (id, job_id, college_id, scope, title, ai_summary, created_by)
VALUES
  (
    'a0000000-0000-0000-0000-000000000001',
    '80000000-0000-0000-0000-000000000001',
    NULL,
    'global',
    'Frontend Engineer Intern Discussion',
    '{"summary":"Students are discussing the frontend stack, interview rounds, and portfolio expectations.","common_questions":["Is React required?","Will there be a machine coding round?"],"interview_difficulty":"medium","preparation_topics":["React","UI fundamentals","API integration"]}'::jsonb,
    '00000000-0000-0000-0000-000000000004'
  ),
  (
    'a0000000-0000-0000-0000-000000000002',
    '80000000-0000-0000-0000-000000000002',
    '10000000-0000-0000-0000-000000000001',
    'college',
    'Alpha Campus Software Analyst Discussion',
    '{"summary":"Alpha students are sharing aptitude prep tips and expected panel questions.","common_questions":["Will SQL be asked?","Is GD part of the process?"],"interview_difficulty":"medium","preparation_topics":["SQL","Problem solving","Communication"]}'::jsonb,
    '00000000-0000-0000-0000-000000000004'
  )
ON CONFLICT (id) DO NOTHING;

INSERT INTO discussion_replies (discussion_id, user_id, body, created_at)
VALUES
  ('a0000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000004', 'The JD looks clean. I am expecting React fundamentals and a small UI build task.', NOW() - INTERVAL '5 hours'),
  ('a0000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000006', 'For off-campus roles like this, my advice is to polish one strong portfolio project and be ready to explain tradeoffs.', NOW() - INTERVAL '3 hours'),
  ('a0000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000004', 'CDC told us this drive is only for the Alpha shortlist group, so check your eligibility chips before applying.', NOW() - INTERVAL '2 hours')
ON CONFLICT DO NOTHING;

INSERT INTO notifications (user_id, type, title, message, data)
VALUES
  ('00000000-0000-0000-0000-000000000004', 'job_assignment', 'New campus job assigned', 'Alpha Campus Software Analyst is now visible to your batch/group.', '{"job_id":"80000000-0000-0000-0000-000000000002"}'::jsonb),
  ('00000000-0000-0000-0000-000000000007', 'job_status', 'Job approved', 'Frontend Engineer Intern passed AI review and is now live on TrustHire.', '{"job_id":"80000000-0000-0000-0000-000000000001"}'::jsonb),
  ('00000000-0000-0000-0000-000000000008', 'appeal', 'Job blocked by AI review', 'Urgent AI Research Fellowship was blocked and can be appealed with additional evidence.', '{"job_id":"80000000-0000-0000-0000-000000000003"}'::jsonb)
ON CONFLICT DO NOTHING;

INSERT INTO appeals (id, job_id, employer_id, submitted_by, reason, status, created_at)
VALUES
  (
    'b0000000-0000-0000-0000-000000000001',
    '80000000-0000-0000-0000-000000000003',
    '60000000-0000-0000-0000-000000000002',
    '00000000-0000-0000-0000-000000000008',
    'We can provide incorporation documents and remove the registration message from the posting.',
    'pending',
    NOW() - INTERVAL '1 hour'
  )
ON CONFLICT (id) DO NOTHING;

INSERT INTO audit_logs (actor_id, college_id, action, entity_type, entity_id, metadata)
VALUES
  ('00000000-0000-0000-0000-000000000001', NULL, 'college_approved', 'college', '10000000-0000-0000-0000-000000000001', '{"status":"approved"}'::jsonb),
  ('00000000-0000-0000-0000-000000000001', NULL, 'employer_verified', 'employer', '60000000-0000-0000-0000-000000000001', '{"verification_status":"verified"}'::jsonb),
  ('00000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', 'job_assignment_approved', 'job_assignment', '90000000-0000-0000-0000-000000000001', '{"visibility_status":"approved"}'::jsonb),
  ('00000000-0000-0000-0000-000000000001', NULL, 'job_blocked_by_ai', 'job', '80000000-0000-0000-0000-000000000003', '{"risk_level":"high","scam_score":91}'::jsonb)
ON CONFLICT DO NOTHING;

DROP FUNCTION IF EXISTS seed_auth_user(UUID, TEXT, TEXT, JSONB);

-- Demo credentials
-- admin@trusthire.dev / TrustHire@123
-- cdc.alpha@alpha.edu / TrustHire@123
-- cdc.beta@beta.edu / TrustHire@123
-- student1@alpha.edu / TrustHire@123
-- student1@beta.edu / TrustHire@123
-- alumni@alpha.edu / TrustHire@123
-- recruiter@acme.com / TrustHire@123
-- founder@novalabs.ai / TrustHire@123
