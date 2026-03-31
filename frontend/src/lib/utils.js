export const roleLabels = {
  super_admin: 'Super Admin',
  cdc_admin: 'CDC Admin',
  employer: 'Employer',
  student: 'Student',
  alumni: 'Alumni',
};

export function getRoleHome(role) {
  switch (role) {
    case 'super_admin':
      return '/super-admin';
    case 'cdc_admin':
      return '/cdc';
    case 'employer':
      return '/employer';
    case 'student':
    case 'alumni':
      return '/student';
    default:
      return '/';
  }
}

export function formatCurrency(value) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return 'Not disclosed';
  }

  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(Number(value));
}

export function formatDate(value) {
  if (!value) {
    return 'Not scheduled';
  }

  return new Intl.DateTimeFormat('en-IN', {
    dateStyle: 'medium',
  }).format(new Date(value));
}

export function sentenceCase(value = '') {
  return String(value).replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());
}

export function joinDefined(values) {
  return values.filter(Boolean).join(' · ');
}

export function arrayFrom(value) {
  if (Array.isArray(value)) {
    return value;
  }

  if (!value) {
    return [];
  }

  return [value];
}

export function statusTone(status = '') {
  const normalized = String(status).toLowerCase();

  if (['approved', 'verified', 'active', 'shortlisted', 'offered', 'strong', 'low'].includes(normalized)) {
    return 'success';
  }

  if (['blocked', 'rejected', 'inactive', 'high', 'flagged'].includes(normalized)) {
    return 'danger';
  }

  if (['restricted', 'pending', 'under review', 'under_review', 'requested', 'medium'].includes(normalized)) {
    return 'warning';
  }

  return 'neutral';
}
