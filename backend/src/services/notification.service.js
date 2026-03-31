const AppError = require('../helpers/AppError');
const { serviceClient } = require('../config/supabase');
const { getPagination } = require('../helpers/pagination');

async function listNotifications(userId, query) {
  const pagination = getPagination(query);
  const { data, error, count } = await serviceClient
    .from('notifications')
    .select('*', { count: 'exact' })
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .range(pagination.from, pagination.to);

  if (error) {
    throw new AppError(500, 'Failed to load notifications');
  }

  return {
    items: data || [],
    pagination: {
      page: pagination.page,
      limit: pagination.limit,
      total: count || 0,
    },
  };
}

async function markAsRead(userId, notificationId) {
  const { data, error } = await serviceClient
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('id', notificationId)
    .eq('user_id', userId)
    .select('*')
    .single();

  if (error || !data) {
    throw new AppError(404, 'Notification not found');
  }

  return data;
}

module.exports = {
  listNotifications,
  markAsRead,
};
