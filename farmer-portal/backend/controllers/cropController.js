/** Crop information pages (static reference content stored in the database). */
const { db } = require('../config/db');

exports.list = (req, res) => {
  res.json({ crops: db.prepare('SELECT slug,name_en,name_hi,name_mr,season FROM crop_info ORDER BY id').all() });
};

exports.getOne = (req, res) => {
  const crop = db.prepare('SELECT * FROM crop_info WHERE slug = ?').get(req.params.slug);
  if (!crop) return res.status(404).json({ error: 'Crop information not available yet.' });
  res.json({ crop });
};
