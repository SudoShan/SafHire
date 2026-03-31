const AppError = require('../helpers/AppError');

function ensureString(value, fieldName, { required = true } = {}) {
  if ((value === undefined || value === null || value === '') && required) {
    throw new AppError(400, `${fieldName} is required`);
  }

  if (value === undefined || value === null || value === '') {
    return null;
  }

  if (typeof value !== 'string') {
    throw new AppError(400, `${fieldName} must be a string`);
  }

  return value.trim();
}

function ensureNumber(value, fieldName, { required = true, min = null, max = null } = {}) {
  if ((value === undefined || value === null || value === '') && required) {
    throw new AppError(400, `${fieldName} is required`);
  }

  if (value === undefined || value === null || value === '') {
    return null;
  }

  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    throw new AppError(400, `${fieldName} must be a valid number`);
  }

  if (min !== null && parsed < min) {
    throw new AppError(400, `${fieldName} must be at least ${min}`);
  }

  if (max !== null && parsed > max) {
    throw new AppError(400, `${fieldName} must be at most ${max}`);
  }

  return parsed;
}

function ensureArray(value, fieldName, { required = false } = {}) {
  if ((value === undefined || value === null) && required) {
    throw new AppError(400, `${fieldName} is required`);
  }

  if (value === undefined || value === null) {
    return [];
  }

  if (!Array.isArray(value)) {
    throw new AppError(400, `${fieldName} must be an array`);
  }

  return value;
}

function ensureEnum(value, fieldName, allowedValues, { required = true } = {}) {
  const parsed = ensureString(value, fieldName, { required });

  if (parsed === null) {
    return null;
  }

  if (!allowedValues.includes(parsed)) {
    throw new AppError(400, `${fieldName} must be one of: ${allowedValues.join(', ')}`);
  }

  return parsed;
}

module.exports = {
  ensureArray,
  ensureEnum,
  ensureNumber,
  ensureString,
};
