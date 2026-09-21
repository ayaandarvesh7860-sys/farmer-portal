/** Farmer notifications shown on the dashboard and in the navbar bell. */
const { db } = require('../config/db');

exports.list = (req, res) => {
  const rows = db.prepare('SELECT * FROM notifications WHERE farmer_id=? ORDER BY id DESC LIMIT 30').all(req.user.id);
  res.json({ notifications: rows, unread: rows.filter(r => !r.is_read).length });
};

exports.markRead = (req, res) => {
  db.prepare('UPDATE notifications SET is_read=1 WHERE id=? AND farmer_id=?').run(req.params.id, req.user.id);
  res.json({ message: 'Notification marked as read.' });
};

exports.markAllRead = (req, res) => {
  db.prepare('UPDATE notifications SET is_read=1 WHERE farmer_id=?').run(req.user.id);
  res.json({ message: 'All notifications marked as read.' });
};

exports.remove = (req, res) => {
  db.prepare('DELETE FROM notifications WHERE id=? AND farmer_id=?').run(req.params.id, req.user.id);
  res.json({ message: 'Notification removed.' });
};
