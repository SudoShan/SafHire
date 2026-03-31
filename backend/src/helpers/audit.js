const { serviceClient } = require('../config/supabase');

async function writeAuditLog({ actorId = null, collegeId = null, action, entityType, entityId = null, metadata = {}, ipAddress = null }) {
  if (!action || !entityType) {
    return;
  }

  await serviceClient.from('audit_logs').insert({
    actor_id: actorId,
    college_id: collegeId,
    action,
    entity_type: entityType,
    entity_id: entityId,
    metadata,
    ip_address: ipAddress,
  });
}

module.exports = {
  writeAuditLog,
};
