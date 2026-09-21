/**
 * Digital document management.
 *
 * PRIVACY: the portal stores only the uploaded file and its verification
 * status. Aadhaar numbers, bank account numbers and IFSC codes are never
 * asked for, never stored and never returned by this API.
 */
const fs = require('fs');
const path = require('path');
const { db } = require('../config/db');
const { UPLOAD_DIR } = require('../middleware/upload');

const DOC_TYPES = [
  { key: 'aadhaar',     label: 'Aadhaar Card',             hint: 'Identity proof, PDF or image' },
  { key: 'farmer_id',   label: 'Farmer ID Card',           hint: 'Issued by the agriculture department' },
  { key: 'land',        label: 'Land Records (7/12)',      hint: 'Ownership or tenancy record' },
  { key: 'bank',        label: 'Bank Passbook Copy',       hint: 'First page showing the account holder name' },
  { key: 'crop_record', label: 'Crop / Cultivation Record', hint: 'Current season sowing record' },
  { key: 'photo',       label: 'Passport Size Photograph', hint: 'Recent photo, JPG or PNG' }
];

exports.list = (req, res) => {
  const rows = db.prepare('SELECT * FROM documents WHERE farmer_id = ?').all(req.user.id);
  const byType = Object.fromEntries(rows.map(r => [r.doc_type, r]));

  const documents = DOC_TYPES.map(t => {
    const d = byType[t.key];
    return {
      ...t,
      uploaded: !!d,
      id: d ? d.id : null,
      file_name: d ? d.file_name : null,
      size_kb: d ? d.size_kb : null,
      status: d ? d.status : 'Not Uploaded',
      uploaded_at: d ? d.uploaded_at : null,
      view_url: d ? `/api/documents/${d.id}/file` : null
    };
  });

  const uploadedCount = documents.filter(d => d.uploaded).length;
  res.json({
    documents,
    uploadedCount,
    totalCount: DOC_TYPES.length,
    verifiedCount: documents.filter(d => d.status === 'Verified').length,
    percent: Math.round((uploadedCount / DOC_TYPES.length) * 100)
  });
};

exports.upload = (req, res) => {
  const type = req.params.type;
  if (!DOC_TYPES.some(t => t.key === type)) return res.status(400).json({ error: 'Unknown document type.' });
  if (!req.file) return res.status(400).json({ error: 'Choose a PDF, JPG or PNG file (maximum 5 MB).' });

  // Replacing a document removes the earlier file from disk.
  const existing = db.prepare('SELECT * FROM documents WHERE farmer_id=? AND doc_type=?').get(req.user.id, type);
  if (existing) {
    const old = path.join(UPLOAD_DIR, existing.stored_name);
    if (fs.existsSync(old)) { try { fs.unlinkSync(old); } catch (e) { /* ignore */ } }
    db.prepare('DELETE FROM documents WHERE id = ?').run(existing.id);
  }

  db.prepare(`INSERT INTO documents (farmer_id,doc_type,file_name,stored_name,mime_type,size_kb,status)
    VALUES (?,?,?,?,?,?,?)`).run(req.user.id, type, req.file.originalname, req.file.filename,
      req.file.mimetype, Math.max(1, Math.round(req.file.size / 1024)), 'Under Verification');

  const label = DOC_TYPES.find(t => t.key === type).label;
  db.prepare('INSERT INTO notifications (farmer_id,title,message,type) VALUES (?,?,?,?)')
    .run(req.user.id, 'Document received', `${label} was uploaded and is now under verification.`, 'info');

  res.status(201).json({ message: `${label} uploaded. It is now under verification.` });
};

exports.remove = (req, res) => {
  const doc = db.prepare('SELECT * FROM documents WHERE id=? AND farmer_id=?').get(req.params.id, req.user.id);
  if (!doc) return res.status(404).json({ error: 'Document not found.' });
  const file = path.join(UPLOAD_DIR, doc.stored_name);
  if (fs.existsSync(file)) { try { fs.unlinkSync(file); } catch (e) { /* ignore */ } }
  db.prepare('DELETE FROM documents WHERE id = ?').run(doc.id);
  res.json({ message: 'Document deleted.' });
};

/** Streams the file back to its owner only. */
exports.file = (req, res) => {
  const doc = db.prepare('SELECT * FROM documents WHERE id=?').get(req.params.id);
  if (!doc) return res.status(404).json({ error: 'Document not found.' });
  if (req.user.role !== 'admin' && doc.farmer_id !== req.user.id) {
    return res.status(403).json({ error: 'You can only open your own documents.' });
  }
  const file = path.join(UPLOAD_DIR, doc.stored_name);
  if (!fs.existsSync(file)) {
    return res.status(404).json({ error: 'This is a sample record; no file is stored for it.' });
  }
  res.type(doc.mime_type).sendFile(file);
};

exports.DOC_TYPES = DOC_TYPES;
