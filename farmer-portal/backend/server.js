/**
 * Smart Farmer Procurement & Assistance Portal
 * Express server: serves the REST API and the frontend pages.
 *
 * Run it with:   npm start       (then open http://localhost:5000)
 */
require('dotenv').config();

const path = require('path');
const express = require('express');
const cors = require('cors');
const multer = require('multer');

const { initSchema, isEmpty } = require('./config/db');
const { seed } = require('./config/seed');

const app = express();
const PORT = process.env.PORT || 5000;

/* ----------------------------- middleware ---------------------------- */
app.use(cors());                                   // allows a separate Live Server front end during development
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

// Small security touch: do not advertise the framework version.
app.disable('x-powered-by');

/* --------------------------- database setup -------------------------- */
initSchema();
if (isEmpty()) {
  const r = seed();
  console.log('[database] ' + r.message);
}

/* ------------------------------- API --------------------------------- */
app.use('/api/auth', require('./routes/auth.routes'));
app.use('/api/farmers', require('./routes/farmer.routes'));
app.use('/api/centres', require('./routes/centre.routes'));
app.use('/api/documents', require('./routes/document.routes'));
app.use('/api/procurements', require('./routes/procurement.routes'));
app.use('/api/transactions', require('./routes/transaction.routes'));
app.use('/api/notifications', require('./routes/notification.routes'));
app.use('/api/crops', require('./routes/crop.routes'));
app.use('/api/assistant', require('./routes/assistant.routes'));
app.use('/api/admin', require('./routes/admin.routes'));

app.get('/api/health', (req, res) => res.json({
  status: 'ok',
  service: 'Smart Farmer Procurement & Assistance Portal',
  aiMode: (process.env.AI_PROVIDER || 'demo').toLowerCase() !== 'demo' && process.env.AI_API_KEY ? 'ai' : 'demo',
  time: new Date().toISOString()
}));

/* --------------------------- frontend files -------------------------- */
const FRONTEND = path.join(__dirname, '..', 'frontend');
app.use(express.static(FRONTEND));
app.get('/', (req, res) => res.sendFile(path.join(FRONTEND, 'index.html')));

/* ------------------------- error handling ---------------------------- */
app.use('/api', (req, res) => res.status(404).json({ error: 'This API route does not exist.' }));

app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    const msg = err.code === 'LIMIT_FILE_SIZE'
      ? 'The file is larger than 5 MB. Upload a smaller file.'
      : 'The file could not be uploaded.';
    return res.status(400).json({ error: msg });
  }
  if (err && err.message && err.message.includes('allowed')) {
    return res.status(400).json({ error: err.message });
  }
  console.error(err);
  res.status(500).json({ error: 'Something went wrong on the server.' });
});

app.listen(PORT, () => {
  console.log('\n  Smart Farmer Procurement & Assistance Portal');
  console.log('  ------------------------------------------------');
  console.log(`  Open the portal at:  http://localhost:${PORT}`);
  console.log('  Demo farmer login :  9876543210 / demo1234');
  console.log('  Demo admin login  :  admin / admin123');
  console.log('  AI assistant mode :  ' +
    ((process.env.AI_PROVIDER || 'demo').toLowerCase() !== 'demo' && process.env.AI_API_KEY ? 'real API' : 'offline demo'));
  console.log('  ------------------------------------------------\n');
});
