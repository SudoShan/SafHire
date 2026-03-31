const { ensureEnum, ensureString } = require('./common');

function validateRegister(req) {
  return {
    fullName: ensureString(req.body.full_name, 'full_name'),
    email: ensureString(req.body.email, 'email'),
    password: ensureString(req.body.password, 'password'),
    roleCode: ensureEnum(req.body.role, 'role', ['student', 'alumni', 'employer']),
  };
}

function validateLogin(req) {
  return {
    email: ensureString(req.body.email, 'email'),
    password: ensureString(req.body.password, 'password'),
  };
}

function validateBootstrap(req) {
  return {
    secret: ensureString(req.body.secret, 'secret'),
    fullName: ensureString(req.body.full_name, 'full_name'),
    email: ensureString(req.body.email, 'email'),
    password: ensureString(req.body.password, 'password'),
  };
}

module.exports = {
  validateBootstrap,
  validateLogin,
  validateRegister,
};
