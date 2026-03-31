const AppError = require('../helpers/AppError');

function validate(validator) {
  return function validationMiddleware(req, _res, next) {
    try {
      req.validated = validator(req);
      return next();
    } catch (error) {
      if (error instanceof AppError) {
        return next(error);
      }
      return next(new AppError(400, error.message || 'Invalid request payload'));
    }
  };
}

module.exports = validate;
