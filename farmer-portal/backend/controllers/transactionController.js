/** Transaction history and digital receipts. */
const { db } = require('../config/db');

const BASE = `SELECT t.*, p.procurement_no, p.variety, p.harvest_date, p.vehicle_no,
                     c.name AS centre_name, c.address AS centre_address, c.contact AS centre_contact,
                     f.name AS farmer_name, f.farmer_code, f.village, f.district, f.state
              FROM transactions t
              JOIN procurement_requests p ON p.id = t.request_id
              JOIN centres c ON c.id = t.centre_id
              JOIN farmers f ON f.id = t.farmer_id`;

exports.list = (req, res) => {
  const { crop, from, to, q } = req.query;
  let sql = BASE + ' WHERE t.farmer_id = ?';
  const params = [req.user.id];
  if (crop) { sql += ' AND t.crop = ?'; params.push(crop); }
  if (from) { sql += ' AND date(t.created_at) >= date(?)'; params.push(from); }
  if (to)   { sql += ' AND date(t.created_at) <= date(?)'; params.push(to); }
  if (q)    { sql += ' AND (t.txn_no LIKE ? OR t.crop LIKE ? OR c.name LIKE ?)';
              params.push(`%${q}%`, `%${q}%`, `%${q}%`); }
  sql += ' ORDER BY t.id DESC';

  const rows = db.prepare(sql).all(...params);
  const total = rows.reduce((s, r) => s + r.amount, 0);
  res.json({ transactions: rows, count: rows.length, totalAmount: total });
};

/** Full receipt payload for one transaction (owner only). */
exports.receipt = (req, res) => {
  const row = db.prepare(BASE + ' WHERE t.txn_no = ? AND t.farmer_id = ?')
    .get(req.params.txnNo, req.user.id);
  if (!row) return res.status(404).json({ error: 'Receipt not found.' });
  res.json({ receipt: row });
};
