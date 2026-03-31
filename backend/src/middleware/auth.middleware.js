// auth.middleware.js — legacy file, kept for compatibility
// The canonical auth middleware is authenticate.js
// This re-exports from authenticate.js so any old imports still work
const { authenticate, authorize, optionalAuthenticate } = require('./authenticate');

module.exports = { authenticate, authorize, optionalAuthenticate };
