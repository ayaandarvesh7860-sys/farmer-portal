/**
 * Database connection (SQLite via better-sqlite3).
 * The database file lives in backend/data/farmer_portal.db and is created
 * automatically the first time the server starts.
 */
const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

const DATA_DIR = path.join(__dirname, '..', 'data');
const DB_FILE = path.join(DATA_DIR, 'farmer_portal.db');

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

const db = new Database(DB_FILE);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

/** Creates every table if it does not exist yet. Safe to call on each start. */
function initSchema() {
  const sql = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
  db.exec(sql);
}

/** True when the database has no farmers yet (so we know to seed it). */
function isEmpty() {
  const row = db.prepare('SELECT COUNT(*) AS c FROM farmers').get();
  return row.c === 0;
}

module.exports = { db, initSchema, isEmpty, DB_FILE };
