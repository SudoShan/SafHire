const env = require('../config/env');

const accessCookieName = 'th_access_token';
const refreshCookieName = 'th_refresh_token';

function cookieOptions(maxAgeMs) {
  return {
    httpOnly: true,
    sameSite: 'lax',
    secure: env.cookieSecure || env.nodeEnv === 'production',
    path: '/',
    maxAge: maxAgeMs,
  };
}

function parseCookies(cookieHeader = '') {
  return cookieHeader
    .split(';')
    .map((chunk) => chunk.trim())
    .filter(Boolean)
    .reduce((acc, part) => {
      const index = part.indexOf('=');
      if (index === -1) {
        return acc;
      }
      const key = part.slice(0, index);
      const value = decodeURIComponent(part.slice(index + 1));
      acc[key] = value;
      return acc;
    }, {});
}

function setAuthCookies(res, session) {
  const expiresAt = session.expires_at ? session.expires_at * 1000 : Date.now() + 60 * 60 * 1000;
  const accessMaxAge = Math.max(expiresAt - Date.now(), 15 * 60 * 1000);

  res.cookie(accessCookieName, session.access_token, cookieOptions(accessMaxAge));
  res.cookie(refreshCookieName, session.refresh_token, cookieOptions(30 * 24 * 60 * 60 * 1000));
}

function clearAuthCookies(res) {
  res.clearCookie(accessCookieName, cookieOptions(0));
  res.clearCookie(refreshCookieName, cookieOptions(0));
}

function extractTokens(req) {
  const cookies = parseCookies(req.headers.cookie);
  const authHeader = req.headers.authorization || '';
  const headerToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

  return {
    accessToken: cookies[accessCookieName] || headerToken || null,
    refreshToken: cookies[refreshCookieName] || null,
  };
}

module.exports = {
  accessCookieName,
  refreshCookieName,
  clearAuthCookies,
  extractTokens,
  parseCookies,
  setAuthCookies,
};
