const express = require('express');
const asyncHandler = require('../helpers/asyncHandler');
const validate = require('../middleware/validate');
const { authenticate } = require('../middleware/authenticate');
const { extractTokens } = require('../helpers/cookies');
const controller = require('../controllers/auth.controller');
const { validateBootstrap, validateLogin, validateRegister } = require('../validators/auth.validators');

const router = express.Router();

router.post('/bootstrap-super-admin', validate(validateBootstrap), asyncHandler(controller.bootstrap));
router.post('/register', validate(validateRegister), asyncHandler(controller.register));
router.post('/login', validate(validateLogin), asyncHandler(controller.login));
router.post(
  '/refresh',
  asyncHandler(async (req, _res, next) => {
    req.refreshToken = extractTokens(req).refreshToken;
    next();
  }),
  asyncHandler(controller.refresh),
);
router.get('/me', authenticate, asyncHandler(controller.me));
router.post('/logout', authenticate, asyncHandler(controller.logout));

module.exports = router;
