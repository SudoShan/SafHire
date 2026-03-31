const { ensureString, ensureEnum } = require('./common');

function validateEmployerProfile(req) {
  return {
    companyName: ensureString(req.body.company_name, 'company_name'),
    companyType: ensureEnum(req.body.company_type, 'company_type', ['mnc', 'startup', 'agency', 'other']),
    officialEmail: ensureString(req.body.official_email, 'official_email'),
    companyDomain: ensureString(req.body.company_domain, 'company_domain'),
    website: ensureString(req.body.website, 'website', { required: false }),
    linkedinUrl: ensureString(req.body.linkedin_url, 'linkedin_url', { required: false }),
    companyLogoUrl: ensureString(req.body.company_logo_url, 'company_logo_url', { required: false }),
    companySize: ensureString(req.body.company_size, 'company_size', { required: false }),
    registrationDocumentUrl: ensureString(req.body.registration_document_url, 'registration_document_url', { required: false }),
  };
}

function validateCollegeAccessRequest(req) {
  return {
    collegeId: ensureString(req.body.college_id, 'college_id'),
    reason: ensureString(req.body.reason, 'reason', { required: false }),
  };
}

module.exports = {
  validateCollegeAccessRequest,
  validateEmployerProfile,
};
