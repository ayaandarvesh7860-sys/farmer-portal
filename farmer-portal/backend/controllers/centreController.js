/**
 * Procurement centre finder.
 * Distance is calculated on the server from the coordinates sent by the
 * browser geolocation API. If the farmer refuses location access, the
 * frontend falls back to a district search and distance is left blank.
 */
const { db } = require('../config/db');
const { distanceKm, waitingMinutes } = require('../utils/helpers');

function decorate(centre, lat, lng) {
  const out = { ...centre, crops: centre.crops.split(',').map(s => s.trim()).filter(Boolean) };
  out.waiting_minutes = waitingMinutes(centre);
  out.hours = `${centre.open_time} - ${centre.close_time}`;
  out.distance_km = (lat !== null && lng !== null)
    ? Math.round(distanceKm(lat, lng, centre.latitude, centre.longitude) * 10) / 10
    : null;
  return out;
}

exports.list = (req, res) => {
  const lat = req.query.lat !== undefined && req.query.lat !== '' ? parseFloat(req.query.lat) : null;
  const lng = req.query.lng !== undefined && req.query.lng !== '' ? parseFloat(req.query.lng) : null;
  const q = (req.query.q || '').trim().toLowerCase();
  const crop = (req.query.crop || '').trim().toLowerCase();
  const status = (req.query.status || '').trim();
  const sort = req.query.sort || 'distance';

  let centres = db.prepare('SELECT * FROM centres').all().map(c => decorate(c, lat, lng));

  if (q) {
    centres = centres.filter(c =>
      [c.name, c.address, c.village, c.district, c.state].join(' ').toLowerCase().includes(q));
  }
  if (crop) centres = centres.filter(c => c.crops.some(x => x.toLowerCase() === crop));
  if (status) centres = centres.filter(c => c.status === status);

  const byDistance = (a, b) => (a.distance_km ?? 9999) - (b.distance_km ?? 9999);
  if (sort === 'distance') centres.sort(byDistance);
  else if (sort === 'queue') centres.sort((a, b) => a.queue_count - b.queue_count);
  else if (sort === 'name') centres.sort((a, b) => a.name.localeCompare(b.name));

  res.json({ count: centres.length, locationUsed: lat !== null && lng !== null, centres });
};

exports.getOne = (req, res) => {
  const c = db.prepare('SELECT * FROM centres WHERE id = ?').get(req.params.id);
  if (!c) return res.status(404).json({ error: 'Centre not found.' });
  const lat = req.query.lat ? parseFloat(req.query.lat) : null;
  const lng = req.query.lng ? parseFloat(req.query.lng) : null;
  res.json({ centre: decorate(c, lat, lng) });
};

/** Crop list used by the filter dropdown. */
exports.crops = (req, res) => {
  const set = new Set();
  db.prepare('SELECT crops FROM centres').all()
    .forEach(r => r.crops.split(',').forEach(c => set.add(c.trim())));
  res.json({ crops: [...set].filter(Boolean).sort() });
};

exports.decorate = decorate;
