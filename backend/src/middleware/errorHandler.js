const AppError = require('../helpers/AppError');
const env = require('../config/env');

function notFound(_req, _res, next) {
  next(new AppError(404, 'Route not found'));
}

function errorHandler(error, _req, res, _next) {
  const statusCode = error.statusCode || 500;
  const payload = {
    error: {
      message: error.message || 'Internal server error',
    },
  };

  if (error.details) {
    payload.error.details = error.details;
  }

  if (env.nodeEnv !== 'production') {
    payload.error.stack = error.stack;
  }

  res.status(statusCode).json(payload);
}

module.exports = {
  errorHandler,
  notFound,
};
