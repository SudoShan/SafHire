const AppError = require('../helpers/AppError');
const { extractTokens } = require('../helpers/cookies');
const { createPublicClient, createUserClient, serviceClient } = require('../config/supabase');

async function authenticate(req, _res, next) {
  const { accessToken } = extractTokens(req);

  if (!accessToken) {
    return next(new AppError(401, 'Authentication required'));
  }

  const client = createPublicClient();
  const { data, error } = await client.auth.getUser(accessToken);

  if (error || !data.user) {
    return next(new AppError(401, 'Session expired or invalid'));
  }

  const { data: userRecord, error: userError } = await serviceClient
    .from('users')
    .select('*')
    .eq('id', data.user.id)
    .single();

  if (userError || !userRecord) {
    return next(new AppError(401, 'Application profile not found'));
  }

  if (!userRecord.is_active) {
    return next(new AppError(403, 'This account is inactive'));
  }

  req.accessToken = accessToken;
  req.supabase = createUserClient(accessToken);
  req.user = {
    id: data.user.id,
    email: data.user.email,
    roleCode: userRecord.role_code,
    profile: userRecord,
  };

  return next();
}

async function optionalAuthenticate(req, _res, next) {
  const { accessToken } = extractTokens(req);

  if (!accessToken) {
    return next();
  }

  const client = createPublicClient();
  const { data, error } = await client.auth.getUser(accessToken);

  if (error || !data.user) {
    return next();
  }

  const { data: userRecord } = await serviceClient
    .from('users')
    .select('*')
    .eq('id', data.user.id)
    .maybeSingle();

  if (!userRecord || !userRecord.is_active) {
    return next();
  }

  req.accessToken = accessToken;
  req.supabase = createUserClient(accessToken);
  req.user = {
    id: data.user.id,
    email: data.user.email,
    roleCode: userRecord.role_code,
    profile: userRecord,
  };

  return next();
}

function authorize(...allowedRoles) {
  return function authorizeMiddleware(req, _res, next) {
    if (!req.user) {
      return next(new AppError(401, 'Authentication required'));
    }

    if (!allowedRoles.includes(req.user.roleCode)) {
      return next(new AppError(403, 'You do not have permission to access this resource'));
    }

    return next();
  };
}

module.exports = {
  authenticate,
  authorize,
  optionalAuthenticate,
};
