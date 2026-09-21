/**
 * Admin dashboard APIs.
 * Every route in this file is mounted behind requireAdmin, so a farmer token
 * cannot read other farmers' data.
 */
const { db } = require('../config/db');
const { validate } = require('../utils/helpers');
const { completeRequest, STATUS_FLOW } = require('./procurementController');

exports.stats = (req, res) => {
  const one = (sql) => db.prepare(sql).get().c;
  res.json({
    totalFarmers: one('SELECT COUNT(*) c FROM farmers'),
    totalCentres: one('SELECT COUNT(*) c FROM centres'),
    activeRequests: one("SELECT COUNT(*) c FROM procurement_requests WHERE status <> 'Completed'"),
    completedTransactions: one('SELECT COUNT(*) c FROM transactions'),
    pendingDocuments: one("SELECT COUNT(*) c FROM documents WHERE status IN ('Uploaded','Under Verification')"),
    totalAmount: db.prepare('SELECT COALESCE(SUM(amount),0) c FROM transactions').get().c,
    totalQueue: db.prepare('SELECT COALESCE(SUM(queue_count),0) c FROM centres').get().c
  });
};

exports.farmers = (req, res) => {
  const rows = db.prepare(`SELECT f.id, f.farmer_code, f.name, f.mobile, f.email, f.state, f.district, f.village, f.created_at,
      (SELECT COUNT(*) FROM documents d WHERE d.farmer_id=f.id) AS documents,
      (SELECT COUNT(*) FROM procurement_requests p WHERE p.farmer_id=f.id) AS requests
      FROM farmers f ORDER BY f.id DESC`).all();
  res.json({ farmers: rows });
};

exports.requests = (req, res) => {
  const rows = db.prepare(`SELECT p.*, f.name AS farmer_name, f.farmer_code, c.name AS centre_name, t.txn_no
      FROM procurement_requests p
      JOIN farmers f ON f.id = p.farmer_id
      JOIN centres c ON c.id = p.centre_id
      LEFT JOIN transactions t ON t.request_id = p.id
      ORDER BY p.id DESC`).all();
  res.json({ requests: rows, flow: STATUS_FLOW });
};

exports.setRequestStatus = (req, res) => {
  const { status } = req.body;
  if (!STATUS_FLOW.includes(status)) return res.status(400).json({ error: 'Unknown status value.' });
  const row = db.prepare('SELECT * FROM procurement_requests WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Request not found.' });

  db.prepare("UPDATE procurement_requests SET status=?, updated_at=datetime('now','localtime') WHERE id=?")
    .run(status, row.id);

  if (status === 'Completed') {
    completeRequest(row);
  } else {
    db.prepare('INSERT INTO notifications (farmer_id,title,message,type) VALUES (?,?,?,?)')
      .run(row.farmer_id, 'Procurement status updated',
        `Request ${row.procurement_no} is now at the "${status}" stage.`, 'info');
  }
  res.json({ message: `Status set to ${status}.` });
};

exports.documents = (req, res) => {
  const rows = db.prepare(`SELECT d.*, f.name AS farmer_name, f.farmer_code
      FROM documents d JOIN farmers f ON f.id = d.farmer_id ORDER BY d.id DESC`).all();
  res.json({ documents: rows });
};

exports.setDocumentStatus = (req, res) => {
  const allowed = ['Uploaded', 'Under Verification', 'Verified', 'Rejected'];
  const { status } = req.body;
  if (!allowed.includes(status)) return res.status(400).json({ error: 'Unknown document status.' });
  const doc = db.prepare('SELECT * FROM documents WHERE id = ?').get(req.params.id);
  if (!doc) return res.status(404).json({ error: 'Document not found.' });

  db.prepare('UPDATE documents SET status=? WHERE id=?').run(status, doc.id);
  db.prepare('INSERT INTO notifications (farmer_id,title,message,type) VALUES (?,?,?,?)')
    .run(doc.farmer_id, 'Document ' + status.toLowerCase(),
      `Your ${doc.file_name} is now marked "${status}".`, status === 'Verified' ? 'success' : 'info');
  res.json({ message: `Document marked ${status}.` });
};

exports.transactions = (req, res) => {
  const rows = db.prepare(`SELECT t.*, f.name AS farmer_name, f.farmer_code, c.name AS centre_name
      FROM transactions t JOIN farmers f ON f.id=t.farmer_id JOIN centres c ON c.id=t.centre_id
      ORDER BY t.id DESC`).all();
  res.json({ transactions: rows });
};

/* ----------------------------- centres ----------------------------- */

exports.centres = (req, res) => {
  res.json({ centres: db.prepare('SELECT * FROM centres ORDER BY id').all() });
};

function validateCentre(b) {
  const e = {};
  if (!validate.required(b.name)) e.name = 'Enter the centre name.';
  if (!validate.required(b.address)) e.address = 'Enter the address.';
  if (!validate.required(b.district)) e.district = 'Enter the district.';
  if (!validate.number(b.latitude)) e.latitude = 'Latitude must be a number.';
  if (!validate.number(b.longitude)) e.longitude = 'Longitude must be a number.';
  if (!validate.required(b.open_time)) e.open_time = 'Enter the opening time.';
  if (!validate.required(b.close_time)) e.close_time = 'Enter the closing time.';
  if (!['Open', 'Busy', 'Closed'].includes(b.status)) e.status = 'Choose a status.';
  if (!validate.required(b.crops)) e.crops = 'List at least one crop.';
  return e;
}

exports.createCentre = (req, res) => {
  const b = req.body;
  const errors = validateCentre(b);
  if (Object.keys(errors).length) return res.status(400).json({ error: 'Please correct the highlighted fields.', errors });

  const info = db.prepare(`INSERT INTO centres
    (name,address,village,district,state,latitude,longitude,open_time,close_time,queue_count,minutes_per_farmer,status,crops,contact)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).run(
      b.name, b.address, b.village || null, b.district, b.state || 'Maharashtra',
      parseFloat(b.latitude), parseFloat(b.longitude), b.open_time, b.close_time,
      parseInt(b.queue_count || 0, 10), parseInt(b.minutes_per_farmer || 3, 10),
      b.status, b.crops, b.contact || '');
  res.status(201).json({ id: info.lastInsertRowid, message: 'Centre added.' });
};

exports.updateCentre = (req, res) => {
  const b = req.body;
  const errors = validateCentre(b);
  if (Object.keys(errors).length) return res.status(400).json({ error: 'Please correct the highlighted fields.', errors });
  const centre = db.prepare('SELECT id FROM centres WHERE id = ?').get(req.params.id);
  if (!centre) return res.status(404).json({ error: 'Centre not found.' });

  db.prepare(`UPDATE centres SET name=?,address=?,village=?,district=?,state=?,latitude=?,longitude=?,
      open_time=?,close_time=?,queue_count=?,minutes_per_farmer=?,status=?,crops=?,contact=? WHERE id=?`).run(
      b.name, b.address, b.village || null, b.district, b.state || 'Maharashtra',
      parseFloat(b.latitude), parseFloat(b.longitude), b.open_time, b.close_time,
      parseInt(b.queue_count || 0, 10), parseInt(b.minutes_per_farmer || 3, 10),
      b.status, b.crops, b.contact || '', req.params.id);
  res.json({ message: 'Centre updated.' });
};

exports.deleteCentre = (req, res) => {
  const used = db.prepare('SELECT COUNT(*) c FROM procurement_requests WHERE centre_id=?').get(req.params.id).c;
  if (used) return res.status(400).json({ error: 'This centre has procurement records and cannot be deleted.' });
  db.prepare('DELETE FROM centres WHERE id=?').run(req.params.id);
  res.json({ message: 'Centre removed.' });
};

exports.deleteFarmer = (req, res) => {
  const f = db.prepare('SELECT * FROM farmers WHERE id=?').get(req.params.id);
  if (!f) return res.status(404).json({ error: 'Farmer not found.' });
  if (f.farmer_code === 'FRM1001') return res.status(400).json({ error: 'The demo farmer account is protected.' });
  db.prepare('DELETE FROM farmers WHERE id=?').run(f.id);
  res.json({ message: 'Farmer account removed.' });
};
