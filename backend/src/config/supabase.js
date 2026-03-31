const { createClient } = require('@supabase/supabase-js');
const env = require('./env');

const baseAuthConfig = {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
};

const createPublicClient = () =>
  createClient(env.supabaseUrl, env.supabaseAnonKey, baseAuthConfig);

const serviceClient = createClient(env.supabaseUrl, env.supabaseServiceRoleKey, baseAuthConfig);

const createUserClient = (accessToken) =>
  createClient(env.supabaseUrl, env.supabaseAnonKey, {
    ...baseAuthConfig,
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  });

module.exports = {
  createPublicClient,
  createUserClient,
  serviceClient,
};
