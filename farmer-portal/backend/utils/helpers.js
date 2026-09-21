/** Small shared helpers used by the controllers. */

/** Distance in km between two coordinates (Haversine formula). */
function distanceKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const toRad = d => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 +
            Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function pad(n, len = 2) { return String(n).padStart(len, '0'); }

function stamp(date = new Date()) {
  return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}`;
}

/** PRC + yyyymmdd + 5 random digits */
function makeProcurementNo() {
  return 'PRC' + stamp() + pad(Math.floor(Math.random() * 100000), 5);
}

/** TXN + yyyymmdd + 4 random digits */
function makeTxnNo() {
  return 'TXN' + stamp() + pad(Math.floor(Math.random() * 10000), 4);
}

/** Next farmer code such as FRM1005, based on the highest existing one. */
function nextFarmerCode(db) {
  const row = db.prepare("SELECT farmer_code FROM farmers ORDER BY id DESC LIMIT 1").get();
  const last = row ? parseInt(String(row.farmer_code).replace(/\D/g, ''), 10) : 1000;
  return 'FRM' + (isNaN(last) ? 1001 : last + 1);
}

/** Simple, readable validation helpers used by every form endpoint. */
const validate = {
  required: (v) => v !== undefined && v !== null && String(v).trim() !== '',
  mobile: (v) => /^[6-9]\d{9}$/.test(String(v || '').trim()),
  email: (v) => !v || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(v).trim()),
  password: (v) => String(v || '').length >= 6,
  number: (v) => !isNaN(parseFloat(v)) && isFinite(v)
};

/** Estimated waiting time in minutes for a centre. */
function waitingMinutes(centre) {
  if (centre.status === 'Closed') return 0;
  return centre.queue_count * centre.minutes_per_farmer;
}

module.exports = { distanceKm, makeProcurementNo, makeTxnNo, nextFarmerCode, validate, waitingMinutes };
