const authService = require('../services/auth.service');

async function bootstrap(req, res) {
  const admin = await authService.bootstrapSuperAdmin(req.validated);
  res.status(201).json({ user: admin });
}

async function register(req, res) {
  const user = await authService.registerPublicUser(req.validated);
  res.status(201).json({ user, message: 'Registration successful' });
}

async function login(req, res) {
  const user = await authService.login(req.validated, res);
  res.json({ user, message: 'Login successful' });
}

async function refresh(req, res) {
  const user = await authService.refreshSession(req.refreshToken, res);
  res.json({ user, message: 'Session refreshed' });
}

async function me(req, res) {
  const user = await authService.getCurrentUserBundle(req.user.id);
  res.json({ user });
}

async function logout(req, res) {
  const result = await authService.logout(req, res);
  res.json(result);
}

module.exports = {
  bootstrap,
  login,
  logout,
  me,
  refresh,
  register,
};
