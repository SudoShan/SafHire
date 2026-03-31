const { serviceClient } = require('./src/config/supabase');

(async () => {
  const employersCols = [
    'company_name',
    'company_type',
    'official_email',
    'company_domain',
    'website',
    'linkedin_url',
    'company_logo_url',
    'company_size',
    'registration_document_url',
    'credibility_score',
    'verification_status',
    'verified_by',
    'verified_at',
    'blocked_reason',
  ];

  for (const col of employersCols) {
    const r = await serviceClient.from('employers').select(col).limit(1);
    console.log(`employers.${col}: ${r.error ? '❌ MISSING (' + r.error.message + ')' : '✅ OK'}`);
  }
})();
