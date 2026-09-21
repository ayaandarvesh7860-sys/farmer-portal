/**
 * Demo data loader.
 *
 * Run automatically on first start, or manually:
 *     npm run seed      -> fills the database only if it is empty
 *     npm run reset     -> deletes everything and loads fresh demo data
 *
 * =====================================================================
 * IMPORTANT (privacy): every name, mobile number, farmer code, centre and
 * document below is FICTIONAL and created only for a classroom demo.
 * No real Aadhaar number, bank account or personal data is used anywhere.
 * =====================================================================
 */
const bcrypt = require('bcryptjs');
const { db, initSchema, isEmpty } = require('./db');

const CENTRES = [
  {
    name: 'Government Procurement Centre - Nashik',
    address: 'Market Yard Road, Panchavati, Nashik',
    village: 'Panchavati', district: 'Nashik', state: 'Maharashtra',
    latitude: 20.0110, longitude: 73.7900,
    open_time: '09:00', close_time: '17:00',
    queue_count: 12, minutes_per_farmer: 3, status: 'Open',
    crops: 'Wheat,Soybean,Onion,Maize',
    contact: '+91 20 0000 1001'
  },
  {
    name: 'Krishi Upaj Mandi - Dindori',
    address: 'Mandi Complex, Station Road, Dindori',
    village: 'Dindori', district: 'Nashik', state: 'Maharashtra',
    latitude: 20.2000, longitude: 73.8300,
    open_time: '08:30', close_time: '16:30',
    queue_count: 4, minutes_per_farmer: 4, status: 'Open',
    crops: 'Onion,Wheat,Pulses',
    contact: '+91 20 0000 1002'
  },
  {
    name: 'Farmer Producer Centre - Sinnar',
    address: 'NH-60 Bypass, Near Bus Stand, Sinnar',
    village: 'Sinnar', district: 'Nashik', state: 'Maharashtra',
    latitude: 19.8500, longitude: 74.0000,
    open_time: '09:00', close_time: '18:00',
    queue_count: 27, minutes_per_farmer: 3, status: 'Busy',
    crops: 'Soybean,Maize,Cotton',
    contact: '+91 20 0000 1003'
  },
  {
    name: 'Cooperative Procurement Centre - Niphad',
    address: 'Sugar Factory Road, Niphad',
    village: 'Niphad', district: 'Nashik', state: 'Maharashtra',
    latitude: 20.0800, longitude: 74.1100,
    open_time: '10:00', close_time: '17:00',
    queue_count: 0, minutes_per_farmer: 5, status: 'Closed',
    crops: 'Sugarcane,Wheat,Rice',
    contact: '+91 20 0000 1004'
  },
  {
    name: 'State Warehouse Procurement Point - Igatpuri',
    address: 'Warehouse Lane, Igatpuri',
    village: 'Igatpuri', district: 'Nashik', state: 'Maharashtra',
    latitude: 19.6950, longitude: 73.5600,
    open_time: '09:30', close_time: '16:00',
    queue_count: 8, minutes_per_farmer: 4, status: 'Open',
    crops: 'Rice,Pulses,Maize',
    contact: '+91 20 0000 1005'
  },
  {
    name: 'District Procurement Centre - Sangamner',
    address: 'Agriculture Market Committee, Sangamner',
    village: 'Sangamner', district: 'Ahmednagar', state: 'Maharashtra',
    latitude: 19.5700, longitude: 74.2100,
    open_time: '08:00', close_time: '16:00',
    queue_count: 15, minutes_per_farmer: 3, status: 'Open',
    crops: 'Wheat,Cotton,Soybean,Pulses',
    contact: '+91 24 0000 1006'
  }
];

const CROPS = [
  {
    slug: 'wheat', name_en: 'Wheat', name_hi: 'गेहूं', name_mr: 'गहू',
    season: 'Rabi - sown November to December, harvested March to April',
    cultivation: 'Prepare a fine seedbed with two or three ploughings. Sow 100-125 kg of certified seed per hectare in rows 20-22 cm apart. Apply a balanced dose of nitrogen, phosphorus and potash as advised by the local Krishi Vigyan Kendra soil test report.',
    soil: 'Well drained loam or clay loam with pH between 6.0 and 7.5. Avoid water-logged fields.',
    irrigation: 'Five to six irrigations. The crown root stage (21 days after sowing) and the grain filling stage are the two most critical ones.',
    harvest: 'Harvest when the grain is hard and the straw turns golden yellow, at about 12 per cent grain moisture.',
    storage: 'Dry the grain to below 12 per cent moisture, clean it and store in fumigated bins or gunny bags kept on wooden pallets.',
    issues: 'Yellow rust, loose smut, termites and aphids. Late sowing reduces yield sharply.',
    precautions: 'Use certified seed, treat seed before sowing, and do not irrigate just before harvesting to avoid lodging.',
    msp_note: 'Wheat is covered by the central minimum support price. Confirm the current season rate at your procurement centre.'
  },
  {
    slug: 'rice', name_en: 'Rice', name_hi: 'चावल', name_mr: 'भात',
    season: 'Kharif - nursery in June, transplanting in July, harvest in October to November',
    cultivation: 'Raise a nursery for 21-25 days, then transplant two or three seedlings per hill at 20 x 15 cm spacing. Keep the field puddled and levelled.',
    soil: 'Clay or clay loam that holds water well, pH 5.5 to 7.0.',
    irrigation: 'Maintain 5 cm standing water from transplanting to the flowering stage; drain the field 10 days before harvest.',
    harvest: 'Harvest when 80 per cent of the grains turn straw coloured and the lower grains are firm.',
    storage: 'Dry paddy to 13 per cent moisture in thin layers, then bag and store in a dry ventilated room.',
    issues: 'Blast, bacterial leaf blight, stem borer and brown plant hopper.',
    precautions: 'Do not use excess nitrogen, keep bunds weed free, and follow the recommended transplanting window.',
    msp_note: 'Paddy is procured at the announced minimum support price at government centres.'
  },
  {
    slug: 'cotton', name_en: 'Cotton', name_hi: 'कपास', name_mr: 'कापूस',
    season: 'Kharif - sown May to June, picking from October to January',
    cultivation: 'Sow on ridges at 90 x 60 cm spacing for hybrids. Remove the first flush of weeds within 30 days and earth up the rows.',
    soil: 'Deep black cotton soil with good drainage, pH 6.0 to 8.0.',
    irrigation: 'Mostly rainfed. Where irrigation is available, protective watering at flowering and boll development gives the best response.',
    harvest: 'Pick fully opened bolls in the morning after the dew dries. Keep three or four pickings separate by quality.',
    storage: 'Store seed cotton dry, away from oil and moisture, and never mix wet or stained cotton with clean cotton.',
    issues: 'Pink bollworm, sucking pests, and boll rot in unseasonal rain.',
    precautions: 'Follow the refuge planting advice, destroy crop residue after the season, and avoid extending the crop beyond the recommended period.',
    msp_note: 'Cotton is procured by the Cotton Corporation of India at support prices in notified centres.'
  },
  {
    slug: 'soybean', name_en: 'Soybean', name_hi: 'सोयाबीन', name_mr: 'सोयाबीन',
    season: 'Kharif - sown mid June to early July, harvested September to October',
    cultivation: 'Sow 65-75 kg of seed per hectare at 45 x 5 cm spacing after 100 mm of rainfall. Treat seed with rhizobium culture before sowing.',
    soil: 'Medium to deep black soil with good drainage, pH 6.0 to 7.5.',
    irrigation: 'Usually rainfed. One protective irrigation at pod filling during a dry spell protects the yield.',
    harvest: 'Harvest when the leaves drop and the pods rattle, at about 14 per cent seed moisture.',
    storage: 'Do not stack bags more than five high, keep moisture below 10 per cent, and store away from direct sunlight to protect germination.',
    issues: 'Girdle beetle, stem fly, yellow mosaic virus and root rot in waterlogged patches.',
    precautions: 'Make drainage channels before the monsoon and do not sow too deep, which reduces germination.',
    msp_note: 'Soybean is procured at the minimum support price at notified centres during the marketing season.'
  },
  {
    slug: 'onion', name_en: 'Onion', name_hi: 'प्याज', name_mr: 'कांदा',
    season: 'Kharif, late Kharif and Rabi - Rabi crop from December to April stores the longest',
    cultivation: 'Transplant 6-7 week old seedlings at 15 x 10 cm spacing on raised beds. Stop nitrogen after 60 days so that the bulb matures properly.',
    soil: 'Well drained sandy loam rich in organic matter, pH 6.0 to 7.0.',
    irrigation: 'Light and frequent irrigation. Stop watering 15-20 days before harvest to improve keeping quality.',
    harvest: 'Harvest when about half the necks fall over. Cure the bulbs in shade for a week with the tops on.',
    storage: 'Store in a well ventilated shed on slatted racks, in layers not deeper than 60 cm, and remove sprouted or rotten bulbs weekly.',
    issues: 'Purple blotch, thrips, bolting in early sown crops and storage rot.',
    precautions: 'Avoid excess nitrogen and late irrigation, both of which cause thick necks and poor storage life.',
    msp_note: 'Onion has no central minimum support price; market prices at the mandi decide the rate.'
  },
  {
    slug: 'maize', name_en: 'Maize', name_hi: 'मक्का', name_mr: 'मका',
    season: 'Grown in Kharif, Rabi and summer depending on water availability',
    cultivation: 'Sow 20 kg of seed per hectare at 60 x 20 cm spacing. Apply nitrogen in three splits: basal, knee-high and tasselling.',
    soil: 'Well drained loam to sandy loam, pH 5.5 to 7.5.',
    irrigation: 'Critical stages are knee-high, tasselling and grain filling. Maize cannot tolerate standing water.',
    harvest: 'Harvest when the husks dry and a black layer forms at the base of the grain, at roughly 20 per cent moisture.',
    storage: 'Dry the shelled grain to 12 per cent moisture before bagging to prevent aflatoxin.',
    issues: 'Fall armyworm, stem borer and turcicum leaf blight.',
    precautions: 'Scout for fall armyworm every week in the first 30 days; early detection keeps control simple and cheap.',
    msp_note: 'Maize is covered by the central minimum support price.'
  },
  {
    slug: 'sugarcane', name_en: 'Sugarcane', name_hi: 'गन्ना', name_mr: 'ऊस',
    season: 'Planted in Adsali (July), Pre-seasonal (October) or Suru (January) seasons',
    cultivation: 'Plant healthy three-budded setts in furrows 90-120 cm apart. Earth up twice and prop the crop to prevent lodging.',
    soil: 'Deep, fertile, well drained medium to heavy soil, pH 6.5 to 7.5.',
    irrigation: 'Heavy water requirement. Drip irrigation saves 40 per cent water and raises yield.',
    harvest: 'Harvest at 12-18 months when the crop reaches full maturity; deliver to the mill within 24 hours of cutting.',
    storage: 'Cane is not stored. Cut cane loses sugar quickly, so coordinate cutting with the mill or centre schedule.',
    issues: 'Woolly aphid, early shoot borer, red rot and lodging.',
    precautions: 'Use disease-free seed cane and treat setts before planting.',
    msp_note: 'Sugarcane is governed by the fair and remunerative price announced for the crushing season.'
  },
  {
    slug: 'pulses', name_en: 'Pulses', name_hi: 'दालें', name_mr: 'कडधान्ये',
    season: 'Tur and moong in Kharif; gram in Rabi. Covers tur (arhar), gram (chana) and moong',
    cultivation: 'Treat seed with rhizobium and PSB culture. Keep the spacing wide for tur (90 x 20 cm) and narrow for gram (30 x 10 cm).',
    soil: 'Well drained loam; pulses suffer badly in waterlogged soil.',
    irrigation: 'One or two protective irrigations at flowering and pod filling are enough for most pulses.',
    harvest: 'Harvest when 80 per cent of pods turn brown and dry. Thresh on a clean floor to avoid mixing soil.',
    storage: 'Dry to 9-10 per cent moisture and store in airtight bins to prevent bruchid (dal weevil) damage.',
    issues: 'Pod borer, wilt, and pod fly.',
    precautions: 'Rotate pulses with cereals to break the pest and disease cycle.',
    msp_note: 'Tur, gram and moong are procured at minimum support prices under the price support scheme.'
  },
  {
    slug: 'other', name_en: 'Other', name_hi: 'अन्य फसलें', name_mr: 'इतर पिके',
    season: 'Depends on the crop and the local agro-climatic zone',
    cultivation: 'For crops not listed here, follow the package of practices published by your state agriculture university and confirm the procurement norms at the centre before harvest.',
    soil: 'Get a soil health card test done once every three years and follow the fertiliser advice printed on it.',
    irrigation: 'Plan irrigation around the crop critical stages; micro-irrigation subsidies are available in most states.',
    harvest: 'Harvest at the maturity stage recommended for the variety you have sown.',
    storage: 'Clean, dry and grade the produce before storage to get a better price.',
    issues: 'Varies by crop. Contact the nearest Krishi Vigyan Kendra for a field diagnosis.',
    precautions: 'Keep sale bills, weighing slips and digital receipts safely for scheme claims.',
    msp_note: 'Check with the procurement centre whether this crop is covered by any support price scheme.'
  }
];

function seed({ reset = false } = {}) {
  initSchema();

  if (reset) {
    db.exec(`DELETE FROM transactions;
             DELETE FROM procurement_requests;
             DELETE FROM notifications;
             DELETE FROM documents;
             DELETE FROM farmers;
             DELETE FROM centres;
             DELETE FROM crop_info;
             DELETE FROM admins;`);
  } else if (!isEmpty()) {
    return { seeded: false, message: 'Database already contains data. Use "npm run reset" to reload demo data.' };
  }

  // ---------------- crops ----------------
  const cropStmt = db.prepare(`INSERT OR REPLACE INTO crop_info
    (slug,name_en,name_hi,name_mr,season,cultivation,soil,irrigation,harvest,storage,issues,precautions,msp_note)
    VALUES (@slug,@name_en,@name_hi,@name_mr,@season,@cultivation,@soil,@irrigation,@harvest,@storage,@issues,@precautions,@msp_note)`);
  CROPS.forEach(c => cropStmt.run(c));

  // ---------------- centres ----------------
  const centreStmt = db.prepare(`INSERT INTO centres
    (name,address,village,district,state,latitude,longitude,open_time,close_time,queue_count,minutes_per_farmer,status,crops,contact)
    VALUES (@name,@address,@village,@district,@state,@latitude,@longitude,@open_time,@close_time,@queue_count,@minutes_per_farmer,@status,@crops,@contact)`);
  CENTRES.forEach(c => centreStmt.run(c));

  // ---------------- farmers (fictional) ----------------
  const farmerStmt = db.prepare(`INSERT INTO farmers
    (farmer_code,name,mobile,email,password_hash,state,district,village)
    VALUES (?,?,?,?,?,?,?,?)`);

  const demoHash = bcrypt.hashSync('demo1234', 10);
  const demoFarmerId = farmerStmt.run(
    'FRM1001', 'Rajesh Patil', '9876543210', 'rajesh.demo@example.com',
    demoHash, 'Maharashtra', 'Nashik', 'Demo Village'
  ).lastInsertRowid;

  farmerStmt.run('FRM1002', 'Sunita Jadhav', '9876500002', 'sunita.demo@example.com',
    demoHash, 'Maharashtra', 'Nashik', 'Ozar');
  farmerStmt.run('FRM1003', 'Imran Shaikh', '9876500003', 'imran.demo@example.com',
    demoHash, 'Maharashtra', 'Ahmednagar', 'Ghargaon');
  farmerStmt.run('FRM1004', 'Kavita More', '9876500004', null,
    demoHash, 'Maharashtra', 'Nashik', 'Lasalgaon');

  // ---------------- admin ----------------
  db.prepare('INSERT INTO admins (username,name,password_hash) VALUES (?,?,?)')
    .run('admin', 'Portal Administrator', bcrypt.hashSync('admin123', 10));

  // ---------------- documents of the demo farmer ----------------
  // These rows only describe placeholder files; no real identity data is stored.
  const docStmt = db.prepare(`INSERT INTO documents
    (farmer_id,doc_type,file_name,stored_name,mime_type,size_kb,status)
    VALUES (?,?,?,?,?,?,?)`);
  docStmt.run(demoFarmerId, 'aadhaar', 'sample-id-proof.pdf', 'demo-aadhaar.pdf', 'application/pdf', 220, 'Verified');
  docStmt.run(demoFarmerId, 'farmer_id', 'sample-farmer-card.pdf', 'demo-farmerid.pdf', 'application/pdf', 180, 'Verified');
  docStmt.run(demoFarmerId, 'land', 'sample-land-record-7-12.pdf', 'demo-land.pdf', 'application/pdf', 340, 'Under Verification');
  docStmt.run(demoFarmerId, 'bank', 'sample-bank-passbook.jpg', 'demo-bank.jpg', 'image/jpeg', 150, 'Uploaded');

  // ---------------- past procurement + transactions ----------------
  const reqStmt = db.prepare(`INSERT INTO procurement_requests
    (procurement_no,farmer_id,centre_id,crop,variety,quantity,unit,harvest_date,expected_price,vehicle_no,remarks,status,created_at,updated_at)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`);
  const txnStmt = db.prepare(`INSERT INTO transactions
    (txn_no,request_id,farmer_id,centre_id,crop,quantity,unit,rate,amount,status,created_at)
    VALUES (?,?,?,?,?,?,?,?,?,?,?)`);

  const history = [
    ['PRC2026061500011', 1, 'Wheat',   'Lok-1',    18, 'Quintal', '2026-05-28', 2400, 'MH15AB1234', 'Cleaned and graded', '2026-06-15 10:20:00', 'TXN202606150011', 2425],
    ['PRC2026071000012', 2, 'Onion',   'N-53',     42, 'Quintal', '2026-06-30', 1600, 'MH15AB1234', 'Late kharif crop',    '2026-07-10 09:05:00', 'TXN202607100012', 1580],
    ['PRC2026081900013', 5, 'Pulses',  'Tur ICPL', 11, 'Quintal', '2026-08-05', 7500, null,         '',                    '2026-08-19 11:45:00', 'TXN202608190013', 7550]
  ];

  history.forEach(h => {
    const [no, centreId, crop, variety, qty, unit, harvest, expected, vehicle, remarks, when, txnNo, rate] = h;
    const rid = reqStmt.run(no, demoFarmerId, centreId, crop, variety, qty, unit, harvest,
      expected, vehicle, remarks, 'Completed', when, when).lastInsertRowid;
    txnStmt.run(txnNo, rid, demoFarmerId, centreId, crop, qty, unit, rate, rate * qty, 'Completed', when);
  });

  // one request that is still in progress, so the status tracker can be demonstrated
  reqStmt.run('PRC2026091700014', demoFarmerId, 1, 'Soybean', 'JS-335', 12, 'Quintal',
    '2026-09-10', 4800, 'MH15AB1234', 'Ready for weighing', 'Weighing',
    '2026-09-17 09:30:00', '2026-09-17 12:10:00');

  // ---------------- notifications ----------------
  const notifStmt = db.prepare('INSERT INTO notifications (farmer_id,title,message,type,is_read,created_at) VALUES (?,?,?,?,?,?)');
  notifStmt.run(demoFarmerId, 'Procurement accepted', 'Your soybean request PRC2026091700014 has reached the weighing stage at Nashik centre.', 'success', 0, '2026-09-17 12:10:00');
  notifStmt.run(demoFarmerId, 'Documents under verification', 'Your land record is being verified. You will be informed once it is approved.', 'info', 0, '2026-09-16 17:40:00');
  notifStmt.run(demoFarmerId, 'Queue update', 'Nashik procurement centre currently has 12 farmers in queue. Plan your visit accordingly.', 'warning', 0, '2026-09-18 08:15:00');
  notifStmt.run(demoFarmerId, 'Digital receipt ready', 'Receipt TXN202608190013 for your pulses procurement is ready to download.', 'success', 1, '2026-08-19 12:00:00');

  return { seeded: true, message: 'Demo data loaded successfully.' };
}

module.exports = { seed };

// Allow running this file directly:  node backend/config/seed.js [--reset]
if (require.main === module) {
  const reset = process.argv.includes('--reset');
  const result = seed({ reset });
  console.log(result.message);
  if (result.seeded) {
    console.log('Demo farmer login  ->  mobile 9876543210 / password demo1234');
    console.log('Demo admin login   ->  username admin / password admin123');
  }
}
