const AppError = require('../helpers/AppError');
const env = require('../config/env');
const { createPublicClient, serviceClient } = require('../config/supabase');
const { clearAuthCookies, setAuthCookies } = require('../helpers/cookies');
const { getCdcAdminByUserId, getEmployerByUserId, getStudentByUserId, getUserById } = require('./common.service');

async function loadRoleDetails(user) {
  switch (user.role_code) {
    case 'student':
    case 'alumni':
      return getStudentByUserId(user.id);
    case 'employer':
      return getEmployerByUserId(user.id);
    case 'cdc_admin':
      return getCdcAdminByUserId(user.id);
    default:
      return null;
  }
}

async function getCurrentUserBundle(userId) {
  const user = await getUserById(userId);
  const details = await loadRoleDetails(user);
  return { ...user, details };
}

async function registerPublicUser(payload) {
  const existing = await serviceClient.from('users').select('id').eq('email', payload.email).maybeSingle();
  if (existing.data) {
    throw new AppError(409, 'An account with this email already exists');
  }

  const { data, error } = await serviceClient.auth.admin.createUser({
    email: payload.email,
    password: payload.password,
    email_confirm: true,
    user_metadata: {
      full_name: payload.fullName,
      role: payload.roleCode,
    },
  });

  if (error || !data.user) {
    throw new AppError(400, error?.message || 'Unable to create account');
  }

  const { error: profileError } = await serviceClient.from('users').insert({
    id: data.user.id,
    role_code: payload.roleCode,
    email: payload.email,
    full_name: payload.fullName,
    college_email: payload.roleCode === 'employer' ? null : payload.email,
  });

  if (profileError) {
    await serviceClient.auth.admin.deleteUser(data.user.id);
    throw new AppError(500, 'Unable to create application profile');
  }

  return {
    id: data.user.id,
    email: payload.email,
    full_name: payload.fullName,
    role: payload.roleCode,
  };
}

async function login(payload, res) {
  const client = createPublicClient();
  const { data, error } = await client.auth.signInWithPassword({
    email: payload.email,
    password: payload.password,
  });

  if (error || !data.user || !data.session) {
    throw new AppError(401, 'Invalid email or password');
  }

  setAuthCookies(res, data.session);
  return getCurrentUserBundle(data.user.id);
}

async function refreshSession(refreshToken, res) {
  if (!refreshToken) {
    throw new AppError(401, 'Refresh token is missing');
  }

  const client = createPublicClient();
  const { data, error } = await client.auth.refreshSession({
    refresh_token: refreshToken,
  });

  if (error || !data.session) {
    clearAuthCookies(res);
    throw new AppError(401, 'Unable to refresh session');
  }

  setAuthCookies(res, data.session);
  return getCurrentUserBundle(data.user.id);
}

async function logout(req, res) {
  if (req.supabase) {
    await req.supabase.auth.signOut();
  }
  clearAuthCookies(res);
  return { message: 'Logged out successfully' };
}

async function bootstrapSuperAdmin(payload) {
  if (payload.secret !== env.bootstrapSecret) {
    throw new AppError(403, 'Invalid bootstrap secret');
  }

  const { count } = await serviceClient
    .from('users')
    .select('*', { count: 'exact', head: true })
    .eq('role_code', 'super_admin');

  if ((count || 0) > 0) {
    throw new AppError(409, 'A super admin already exists');
  }

  const { data, error } = await serviceClient.auth.admin.createUser({
    email: payload.email,
    password: payload.password,
    email_confirm: true,
    user_metadata: {
      full_name: payload.fullName,
      role: 'super_admin',
    },
  });

  if (error || !data.user) {
    throw new AppError(400, error?.message || 'Unable to bootstrap super admin');
  }

  const { error: profileError } = await serviceClient.from('users').insert({
    id: data.user.id,
    role_code: 'super_admin',
    email: payload.email,
    full_name: payload.fullName,
  });

  if (profileError) {
    await serviceClient.auth.admin.deleteUser(data.user.id);
    throw new AppError(500, 'Failed to store super admin profile');
  }

  return {
    id: data.user.id,
    email: payload.email,
    full_name: payload.fullName,
    role: 'super_admin',
  };
}

module.exports = {
  bootstrapSuperAdmin,
  getCurrentUserBundle,
  login,
  logout,
  refreshSession,
  registerPublicUser,
};
