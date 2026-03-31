const { ensureNumber, ensureString } = require('./common');

function validateBatch(req) {
  return {
    name: ensureString(req.body.name, 'name'),
    department: ensureString(req.body.department, 'department'),
    graduationYear: ensureNumber(req.body.graduation_year, 'graduation_year', { min: 2020, max: 2050 }),
  };
}

function validateGroup(req) {
  return {
    name: ensureString(req.body.name, 'name'),
    description: ensureString(req.body.description, 'description', { required: false }),
    criteria: req.body.criteria || {},
  };
}

module.exports = {
  validateBatch,
  validateGroup,
};
