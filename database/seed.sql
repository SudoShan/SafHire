-- ============================================
-- TrustHire Sample/Seed Data
-- Run after schema.sql
-- ============================================

-- Note: In production, users are created through Supabase Auth.
-- These are sample records for development/testing.

-- Sample Profiles (UUIDs would come from Supabase Auth)
-- In development, create users through the app first, then use their UUIDs.

-- For testing the AI scam detection, here are sample job descriptions:

-- LEGITIMATE JOB EXAMPLES:
/*
INSERT INTO jobs (employer_id, title, description, salary_min, salary_max, location, job_type, requirements, required_skills, min_cgpa)
VALUES 
  ('<employer_uuid>', 'Software Engineer', 
   'We are looking for a talented Software Engineer to join our engineering team at TechCorp. 
    You will work on building scalable web applications using React and Node.js. 
    Requirements: 2+ years experience, CS degree preferred. 
    Benefits: Health insurance, 401k, flexible hours.',
   60000, 90000, 'Bangalore, India', 'full-time',
   ARRAY['CS degree', '2+ years experience', 'Strong problem-solving skills'],
   ARRAY['React', 'Node.js', 'PostgreSQL', 'TypeScript'],
   7.0),
   
  ('<employer_uuid>', 'Data Science Intern',
   'Join our data science team for a 6-month internship. 
    Work on real-world ML projects with mentorship from senior data scientists.
    Stipend: ₹25,000/month. Office location: Hyderabad.',
   25000, 25000, 'Hyderabad, India', 'internship',
   ARRAY['Currently pursuing CS/IT/Stats degree', 'Python knowledge'],
   ARRAY['Python', 'Machine Learning', 'Pandas', 'SQL'],
   6.5);
*/

-- SCAM JOB EXAMPLES (for testing AI detection):
/*
INSERT INTO jobs (employer_id, title, description, salary_min, salary_max, location, job_type, requirements, required_skills)
VALUES 
  ('<employer_uuid>', 'EARN $5000/WEEK FROM HOME!!!',
   'Amazing opportunity!!! Work from home and earn guaranteed $5000 per week! 
    No experience needed! Just send us your bank details and SSN to get started. 
    This is NOT a scam! Act NOW before spots fill up! 
    Wire transfer fee of $200 required to begin.',
   260000, 260000, 'Remote', 'full-time',
   ARRAY['No experience needed'],
   ARRAY[]),
   
  ('<employer_uuid>', 'Data Entry - Quick Money',
   'Easy data entry job. Pay upfront registration fee of $50 to secure your position.
    Guaranteed income of $3000/month for just 2 hours of work per day.
    Send your personal information including bank account to start immediately.
    Limited positions available - ACT NOW!',
   36000, 36000, 'Remote', 'part-time',
   ARRAY['Basic computer skills'],
   ARRAY['Typing']);
*/

-- Sample vote weights by role
-- student = 1, alumni = 2, admin = 5
-- This is enforced in the application logic
