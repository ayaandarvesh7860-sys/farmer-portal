/** Crop procurement requests and their status workflow. */
const { db } = require('../config/db');
const { makeProcurementNo, makeTxnNo, validate } = require('../utils/helpers');

const STATUS_FLOW = ['Submitted', 'At Centre', 'Weighing', 'Quality Check',
                     'Accepted', 'Payment Processing', 'Completed'];

const UNITS = ['Kg', 'Quintal', 'Ton'];

function withJoins(row) {
  if (!row) return null;
  return { ...row, status_index: STATUS_FLOW.indexOf(row.status), status_flow: STATUS_FLOW };
}

exports.statusFlow = (req, res) => res.json({ flow: STATUS_FLOW, units: UNITS });

exports.create = (req, res) => {
  const { centre_id, crop, variety, quantity, unit, harvest_date, expected_price, vehicle_no, remarks } = req.body;
  const errors = {};

  if (!validate.required(crop)) errors.crop = 'Select the crop.';
  if (!validate.number(quantity) || parseFloat(quantity) <= 0) errors.quantity = 'Enter a quantity greater than zero.';
  if (!UNITS.includes(unit)) errors.unit = 'Select a unit.';
  if (!validate.required(centre_id)) errors.centre_id = 'Select a procurement centre.';
  if (expected_price && !validate.number(expected_price)) errors.expected_price = 'Expected price must be a number.';
  if (vehicle_no && !/^[A-Za-z0-9 -]{4,15}$/.test(String(vehicle_no).trim())) errors.vehicle_no = 'Enter a valid vehicle number.';

  const centre = db.prepare('SELECT * FROM centres WHERE id = ?').get(centre_id);
  if (!centre) errors.centre_id = 'Selected centre is not available.';
  else if (centre.status === 'Closed') errors.centre_id = 'This centre is closed today. Choose another centre.';

  if (Object.keys(errors).length) return res.status(400).json({ error: 'Please correct the highlighted fields.', errors });

  const no = makeProcurementNo();
  const info = db.prepare(`INSERT INTO procurement_requests
    (procurement_no,farmer_id,centre_id,crop,variety,quantity,unit,harvest_date,expected_price,vehicle_no,remarks,status)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,'Submitted')`).run(
      no, req.user.id, centre.id, crop, variety || null, parseFloat(quantity), unit,
      harvest_date || null, expected_price ? parseFloat(expected_price) : null,
      vehicle_no ? String(vehicle_no).trim().toUpperCase() : null, remarks || null);

  // A new request adds one farmer to that centre's queue (demo behaviour).
  db.prepare('UPDATE centres SET queue_count = queue_count + 1 WHERE id = ?').run(centre.id);

  db.prepare('INSERT INTO notifications (farmer_id,title,message,type) VALUES (?,?,?,?)')
    .run(req.user.id, 'Procurement request submitted',
      `Request ${no} for ${quantity} ${unit} of ${crop} was sent to ${centre.name}.`, 'success');

  const row = db.prepare(`SELECT p.*, c.name AS centre_name, c.address AS centre_address
      FROM procurement_requests p JOIN centres c ON c.id=p.centre_id WHERE p.id=?`).get(info.lastInsertRowid);

  res.status(201).json({ request: withJoins(row), message: 'Procurement request submitted successfully.' });
};

exports.list = (req, res) => {
  const { crop, status, from, to, q } = req.query;
  let sql = `SELECT p.*, c.name AS centre_name, t.txn_no, t.amount
             FROM procurement_requests p
             JOIN centres c ON c.id = p.centre_id
             LEFT JOIN transactions t ON t.request_id = p.id
             WHERE p.farmer_id = ?`;
  const params = [req.user.id];
  if (crop)   { sql += ' AND p.crop = ?'; params.push(crop); }
  if (status) { sql += ' AND p.status = ?'; params.push(status); }
  if (from)   { sql += ' AND date(p.created_at) >= date(?)'; params.push(from); }
  if (to)     { sql += ' AND date(p.created_at) <= date(?)'; params.push(to); }
  if (q)      { sql += ' AND (p.procurement_no LIKE ? OR p.crop LIKE ? OR c.name LIKE ?)';
                params.push(`%${q}%`, `%${q}%`, `%${q}%`); }
  sql += ' ORDER BY p.id DESC';

  res.json({ requests: db.prepare(sql).all(...params).map(withJoins) });
};

exports.getOne = (req, res) => {
  const row = db.prepare(`SELECT p.*, c.name AS centre_name, c.address AS centre_address, c.contact AS centre_contact,
      t.txn_no, t.amount, t.rate
      FROM procurement_requests p JOIN centres c ON c.id=p.centre_id
      LEFT JOIN transactions t ON t.request_id = p.id
      WHERE p.id = ? AND p.farmer_id = ?`).get(req.params.id, req.user.id);
  if (!row) return res.status(404).json({ error: 'Procurement request not found.' });
  res.json({ request: withJoins(row) });
};

/**
 * Moves a request to the next stage. In a real deployment the centre operator
 * would do this from the centre software; here the farmer-side demo button and
 * the admin dashboard both use it so the whole flow can be shown in class.
 */
exports.advance = (req, res) => {
  const isAdmin = req.user.role === 'admin';
  const row = isAdmin
    ? db.prepare('SELECT * FROM procurement_requests WHERE id = ?').get(req.params.id)
    : db.prepare('SELECT * FROM procurement_requests WHERE id = ? AND farmer_id = ?').get(req.params.id, req.user.id);
  if (!row) return res.status(404).json({ error: 'Procurement request not found.' });

  const idx = STATUS_FLOW.indexOf(row.status);
  if (idx === STATUS_FLOW.length - 1) {
    return res.status(400).json({ error: 'This procurement is already completed.' });
  }
  const next = STATUS_FLOW[idx + 1];
  db.prepare("UPDATE procurement_requests SET status=?, updated_at=datetime('now','localtime') WHERE id=?")
    .run(next, row.id);

  let txn = null;
  if (next === 'Completed') {
    txn = completeRequest(row);
  } else {
    db.prepare('INSERT INTO notifications (farmer_id,title,message,type) VALUES (?,?,?,?)')
      .run(row.farmer_id, 'Procurement status updated',
        `Request ${row.procurement_no} is now at the "${next}" stage.`, 'info');
  }

  res.json({ status: next, transaction: txn, message: `Status updated to ${next}.` });
};

/** Creates the transaction + digital receipt when a request is completed. */
function completeRequest(row) {
  const existing = db.prepare('SELECT * FROM transactions WHERE request_id = ?').get(row.id);
  if (existing) return existing;

  // Demo pricing: the settled rate is the expected price (or a default rate)
  // adjusted slightly, the way a quality grading would change it in practice.
  const baseRate = row.expected_price || 2200;
  const rate = Math.round(baseRate * (0.97 + Math.random() * 0.06));
  const amount = Math.round(rate * row.quantity);
  const txnNo = makeTxnNo();

  db.prepare(`INSERT INTO transactions (txn_no,request_id,farmer_id,centre_id,crop,quantity,unit,rate,amount,status)
    VALUES (?,?,?,?,?,?,?,?,?,'Completed')`).run(
      txnNo, row.id, row.farmer_id, row.centre_id, row.crop, row.quantity, row.unit, rate, amount);

  db.prepare('UPDATE centres SET queue_count = MAX(queue_count - 1, 0) WHERE id = ?').run(row.centre_id);
  db.prepare('INSERT INTO notifications (farmer_id,title,message,type) VALUES (?,?,?,?)')
    .run(row.farmer_id, 'Digital receipt ready',
      `Procurement ${row.procurement_no} is complete. Receipt ${txnNo} is ready to download.`, 'success');

  return db.prepare('SELECT * FROM transactions WHERE txn_no = ?').get(txnNo);
}

exports.cancel = (req, res) => {
  const row = db.prepare('SELECT * FROM procurement_requests WHERE id=? AND farmer_id=?').get(req.params.id, req.user.id);
  if (!row) return res.status(404).json({ error: 'Procurement request not found.' });
  if (row.status !== 'Submitted') {
    return res.status(400).json({ error: 'A request can only be cancelled before it reaches the centre.' });
  }
  db.prepare('DELETE FROM procurement_requests WHERE id = ?').run(row.id);
  db.prepare('UPDATE centres SET queue_count = MAX(queue_count - 1, 0) WHERE id = ?').run(row.centre_id);
  res.json({ message: 'Procurement request cancelled.' });
};

exports.STATUS_FLOW = STATUS_FLOW;
exports.completeRequest = completeRequest;
