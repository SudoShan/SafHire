const notificationService = require('../services/notification.service');

async function listNotifications(req, res) {
  const result = await notificationService.listNotifications(req.user.id, req.query);
  res.json(result);
}

async function markAsRead(req, res) {
  const notification = await notificationService.markAsRead(req.user.id, req.params.notificationId);
  res.json({ notification });
}

module.exports = {
  listNotifications,
  markAsRead,
};
