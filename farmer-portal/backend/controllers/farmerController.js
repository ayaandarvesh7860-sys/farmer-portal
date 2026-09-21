/** Farmer profile and dashboard statistics. */
const fs = require('fs');
const path = require('path');
const { db } = require('../config/db');
const { validate } = require('../utils/helpers');
const { publicFarmer } = require('./authController');
const { UPLOAD_DIR } = require('../middleware/upload');

exports.getProfile = (req, res) => {
  const f = db.prepare('SELECT * FROM farmers WHERE id = ?').get(req.user.id);
  if (!f) return res.status(404).json({ error: 'Account not found.' });
  res.json({ farmer: publicFarmer(f) });
};

exports.updateProfile = (req, res) => {
  const { name, email, state, district, village } = req.body;
  const errors = {};
  if (!validate.required(name)) errors.name = 'Name cannot be empty.';
  if (!validate.email(email)) errors.email = 'Enter a valid email address or leave it blank.';
  if (!validate.required(district)) errors.district = 'Enter the district.';
  if (!validate.required(village)) errors.village = 'Enter the village.';
  if (Object.keys(errors).length) return res.status(400).json({ error: 'Please correct the highlighted fields.', errors });

  // Mobile number and farmer code are not editable here: they identify the account.
  db.prepare('UPDATE farmers SET name=?, email=?, state=?, district=?, village=? WHERE id=?')
    .run(String(name).trim(), email ? String(email).trim() : null, state, district, village, req.user.id);

  const f = db.prepare('SELECT * FROM farmers WHERE id = ?').get(req.user.id);
  res.json({ farmer: publicFarmer(f), message: 'Profile saved.' });
};

exports.uploadPhoto = (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Choose a JPG or PNG photo first.' });
  db.prepare('UPDATE farmers SET photo = ? WHERE id = ?').run(req.file.filename, req.user.id);
  res.json({ photo: req.file.filename, message: 'Profile photo updated.' });
};

/**
 * Serves a profile photo.
 * Only file names that are actually registered as a profile photo can be
 * requested, so identity documents in the same folder stay private.
 */
exports.photo = (req, res) => {
  const name = path.basename(String(req.params.file || ''));
  const owner = db.prepare('SELECT id FROM farmers WHERE photo = ?').get(name);
  if (!owner) return res.status(404).json({ error: 'Photo not found.' });
  const file = path.join(UPLOAD_DIR, name);
  if (!fs.existsSync(file)) return res.status(404).json({ error: 'Photo not found.' });
  res.sendFile(file);
};

exports.stats = (req, res) => {
  const id = req.user.id;
  const totalRequests = db.prepare('SELECT COUNT(*) c FROM procurement_requests WHERE farmer_id=?').get(id).c;
  const completed = db.prepare("SELECT COUNT(*) c FROM transactions WHERE farmer_id=?").get(id).c;
  const active = db.prepare("SELECT COUNT(*) c FROM procurement_requests WHERE farmer_id=? AND status<>'Completed'").get(id).c;

  // Quantities are normalised to quintal so that the dashboard shows one number.
  const rows = db.prepare('SELECT quantity, unit FROM procurement_requests WHERE farmer_id=?').all(id);
  const toQuintal = (q, u) => u === 'Kg' ? q / 100 : u === 'Ton' ? q * 10 : q;
  const totalQuintal = rows.reduce((s, r) => s + toQuintal(r.quantity, r.unit), 0);

  const earned = db.prepare('SELECT COALESCE(SUM(amount),0) s FROM transactions WHERE farmer_id=?').get(id).s;
  const latest = db.prepare(`SELECT t.*, c.name AS centre_name FROM transactions t
      JOIN centres c ON c.id = t.centre_id
      WHERE t.farmer_id=? ORDER BY t.id DESC LIMIT 1`).get(id);
  const docs = db.prepare('SELECT COUNT(*) c FROM documents WHERE farmer_id=?').get(id).c;

  res.json({
    totalRequests, completedTransactions: completed, activeRequests: active,
    totalQuantityQuintal: Math.round(totalQuintal * 100) / 100,
    totalAmount: earned, documentsUploaded: docs, documentsRequired: 6,
    latestTransaction: latest || null
  });
};
