const axios = require('axios');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '.env') });

const AI_URL = process.env.AI_SERVICE_URL || 'http://localhost:8000';
const BACKEND_URL = `http://localhost:${process.env.PORT || 5000}/api`;
const AI_INTERNAL_SECRET = process.env.AI_INTERNAL_SECRET || 'trusthire-local-secret';

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m'
};

async function check(name, testFn) {
  process.stdout.write(`Testing ${colors.cyan}${name}${colors.reset}... `);
  try {
    const start = Date.now();
    const result = await testFn();
    const time = Date.now() - start;
    console.log(`${colors.green}✅ PASS${colors.reset} (${time}ms) ${result ? `- ${result}` : ''}`);
    return true;
  } catch (error) {
    console.log(`${colors.red}❌ FAIL${colors.reset}`);
    console.error(`  ${colors.red}${error.message}${colors.reset}`);
    if (error.response?.data) {
      console.error(`  Details: ${JSON.stringify(error.response.data)}`);
    }
    return false;
  }
}

async function runAllTests() {
  console.log(`\n${colors.cyan}==========================================${colors.reset}`);
  console.log(`${colors.cyan}    TrustHire API E2E Verification        ${colors.reset}`);
  console.log(`${colors.cyan}==========================================${colors.reset}\n`);

  let passed = 0;
  let total = 0;

  const run = async (name, fn) => {
    total++;
    const ok = await check(name, fn);
    if (ok) passed++;
  };

  // 1. PUBLIC BACKEND ENDPOINTS
  console.log(`\n${colors.yellow}>> BACKEND PUBLIC ROUTES${colors.reset}`);
  
  await run('Backend API Health', async () => {
    const res = await axios.get(`${BACKEND_URL}/health`);
    return `Version: ${res.data.timestamp}`;
  });

  await run('Fetch Public Jobs', async () => {
    const res = await axios.get(`${BACKEND_URL}/jobs`);
    return `Loaded ${res.data.jobs ? res.data.jobs.length : res.data.length || 0} jobs`;
  });

  await run('Fetch Colleges List', async () => {
    const res = await axios.get(`${BACKEND_URL}/students/colleges`);
    return `Loaded ${res.data.colleges ? res.data.colleges.length : 0} colleges`;
  });

  // 2. AI MICROSERVICE ENDPOINTS
  console.log(`\n${colors.yellow}>> AI MICROSERVICE ROUTES (Internal communication)${colors.reset}`);
  const aiHeaders = { headers: { 'x-internal-secret': AI_INTERNAL_SECRET } };

  await run('AI Health & Diagnostics', async () => {
    const res = await axios.get(`${AI_URL}/health`);
    return `${res.data.service} v${res.data.version}`;
  });

  await run('Scam Predictor Engine', async () => {
    const res = await axios.post(`${AI_URL}/predict-scam`, {
      title: 'Guaranteed Data Entry Work from Home',
      description: 'Pay a small registration fee of 500 INR to start earning 100,000 INR monthly from home immediately! No qualifications needed.',
      salary_min: 100000,
      salary_max: 200000,
      requirements: ['No experience required']
    }, aiHeaders);
    return `Score: ${res.data.scam_score}, Risk: ${res.data.risk_level}, Match: ${res.data.match_quality}`;
  });

  await run('Smart Resume Matcher', async () => {
    const res = await axios.post(`${AI_URL}/match-job`, {
      student_skills: ['React', 'JavaScript', 'Node.js', 'Express', 'Supabase'],
      job_description: 'We are looking for a full stack engineer.',
      job_requirements: ['React', 'Node.js', 'PostgreSQL', 'Docker']
    }, aiHeaders);
    return `Fit Score: ${res.data.fit_score}, Band: ${res.data.fit_band}`;
  });

  await run('Interview Prep Generator', async () => {
    const res = await axios.post(`${AI_URL}/generate-prep`, {
      job_title: 'Full Stack Developer',
      job_description: 'Build fast web apps using React and Node.js',
      required_skills: ['React', 'Node.js', 'PostgreSQL'],
      student_skills: ['React', 'Express', 'MongoDB']
    }, aiHeaders);
    return `Generated ${res.data.roadmap?.length || 0} steps, Domain: ${res.data.domain}`;
  });

  await run('Discussion Thread Summarizer', async () => {
    const res = await axios.post(`${AI_URL}/summarize-discussion`, {
      messages: 'Student 1: How was the technical round?\nStudent 2: It was quite tough! Lots of questions on React hooks and Node streams.\nStudent 3: Yeah, very difficult algorithm questions too.',
      job_id: 'test-job'
    }, aiHeaders);
    return `Difficulty: ${res.data.interview_difficulty}, Topics: ${res.data.preparation_topics?.join(', ') || 'none'}`;
  });

  // SUMMARY
  console.log(`\n${colors.cyan}==========================================${colors.reset}`);
  const allPassed = passed === total;
  if (allPassed) {
    console.log(`${colors.green}   ALL ${passed}/${total} ENDPOINTS PASSED SUCCESSFULLY!${colors.reset}`);
  } else {
    console.log(`${colors.yellow}   ${passed}/${total} ENDPOINTS PASSED. SEE ERRORS ABOVE.${colors.reset}`);
  }
  console.log(`${colors.cyan}==========================================${colors.reset}\n`);
}

runAllTests();
