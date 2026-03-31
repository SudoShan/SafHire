const path = require('node:path');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const required = ['SUPABASE_URL', 'SUPABASE_ANON_KEY', 'SUPABASE_SERVICE_ROLE_KEY'];

for (const key of required) {
  if (!process.env[key]) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
}

const parseNumber = (value, fallback) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
};

module.exports = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseNumber(process.env.PORT, 5000),
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',
  supabaseUrl: process.env.SUPABASE_URL,
  supabaseAnonKey: process.env.SUPABASE_ANON_KEY,
  supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
  aiServiceUrl: process.env.AI_SERVICE_URL || 'http://localhost:8000',
  aiInternalSecret: process.env.AI_INTERNAL_SECRET || 'trusthire-local-secret',
  scamThreshold: parseNumber(process.env.SCAM_THRESHOLD, 70),
  cookieSecure: process.env.COOKIE_SECURE === 'true',
  bootstrapSecret: process.env.BOOTSTRAP_SECRET || 'trusthire-bootstrap',
};
