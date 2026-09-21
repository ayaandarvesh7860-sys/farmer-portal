-- =====================================================================
--  Smart Farmer Procurement & Assistance Portal - database schema
--  Engine: SQLite (file: backend/data/farmer_portal.db)
--
--  PRIVACY NOTE: this schema intentionally has NO column for Aadhaar
--  numbers or bank account numbers. Identity documents are stored only
--  as uploaded files with a verification status, and the demo data is
--  completely fictional. Never load real citizen data into this project.
-- =====================================================================

PRAGMA foreign_keys = ON;

-- ---------------------------------------------------------------- 1
CREATE TABLE IF NOT EXISTS farmers (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  farmer_code   TEXT    NOT NULL UNIQUE,          -- e.g. FRM1001 (public id)
  name          TEXT    NOT NULL,
  mobile        TEXT    NOT NULL UNIQUE,
  email         TEXT,
  password_hash TEXT    NOT NULL,                 -- bcrypt hash, never plain text
  state         TEXT    NOT NULL,
  district      TEXT    NOT NULL,
  village       TEXT    NOT NULL,
  photo         TEXT,                             -- file name inside backend/uploads
  created_at    TEXT    NOT NULL DEFAULT (datetime('now','localtime'))
);

-- ---------------------------------------------------------------- 2
CREATE TABLE IF NOT EXISTS documents (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  farmer_id   INTEGER NOT NULL,
  doc_type    TEXT    NOT NULL,                   -- aadhaar | farmer_id | land | bank | crop_record | photo
  file_name   TEXT    NOT NULL,                   -- original name shown to the farmer
  stored_name TEXT    NOT NULL,                   -- randomised name on disk
  mime_type   TEXT    NOT NULL,
  size_kb     INTEGER NOT NULL,
  status      TEXT    NOT NULL DEFAULT 'Uploaded',-- Uploaded | Under Verification | Verified | Rejected
  uploaded_at TEXT    NOT NULL DEFAULT (datetime('now','localtime')),
  UNIQUE (farmer_id, doc_type),
  FOREIGN KEY (farmer_id) REFERENCES farmers(id) ON DELETE CASCADE
);

-- ---------------------------------------------------------------- 3
CREATE TABLE IF NOT EXISTS centres (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  name        TEXT    NOT NULL,
  address     TEXT    NOT NULL,
  village     TEXT,
  district    TEXT    NOT NULL,
  state       TEXT    NOT NULL,
  latitude    REAL    NOT NULL,
  longitude   REAL    NOT NULL,
  open_time   TEXT    NOT NULL,                   -- "09:00"
  close_time  TEXT    NOT NULL,                   -- "17:00"
  queue_count INTEGER NOT NULL DEFAULT 0,
  minutes_per_farmer INTEGER NOT NULL DEFAULT 3,  -- used for waiting-time estimate
  status      TEXT    NOT NULL DEFAULT 'Open',    -- Open | Busy | Closed
  crops       TEXT    NOT NULL,                   -- comma separated crop list
  contact     TEXT    NOT NULL,
  created_at  TEXT    NOT NULL DEFAULT (datetime('now','localtime'))
);

-- ---------------------------------------------------------------- 4
CREATE TABLE IF NOT EXISTS procurement_requests (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  procurement_no TEXT    NOT NULL UNIQUE,         -- PRC2026091800012
  farmer_id      INTEGER NOT NULL,
  centre_id      INTEGER NOT NULL,
  crop           TEXT    NOT NULL,
  variety        TEXT,
  quantity       REAL    NOT NULL,
  unit           TEXT    NOT NULL,                -- Kg | Quintal | Ton
  harvest_date   TEXT,
  expected_price REAL,                            -- rupees per unit
  vehicle_no     TEXT,
  remarks        TEXT,
  status         TEXT    NOT NULL DEFAULT 'Submitted',
  created_at     TEXT    NOT NULL DEFAULT (datetime('now','localtime')),
  updated_at     TEXT    NOT NULL DEFAULT (datetime('now','localtime')),
  FOREIGN KEY (farmer_id) REFERENCES farmers(id) ON DELETE CASCADE,
  FOREIGN KEY (centre_id) REFERENCES centres(id)
);

-- ---------------------------------------------------------------- 5
CREATE TABLE IF NOT EXISTS transactions (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  txn_no         TEXT    NOT NULL UNIQUE,         -- TXN202609180012
  request_id     INTEGER NOT NULL,
  farmer_id      INTEGER NOT NULL,
  centre_id      INTEGER NOT NULL,
  crop           TEXT    NOT NULL,
  quantity       REAL    NOT NULL,
  unit           TEXT    NOT NULL,
  rate           REAL    NOT NULL,                -- final rate per unit
  amount         REAL    NOT NULL,                -- rate * quantity
  status         TEXT    NOT NULL DEFAULT 'Completed',
  created_at     TEXT    NOT NULL DEFAULT (datetime('now','localtime')),
  FOREIGN KEY (request_id) REFERENCES procurement_requests(id) ON DELETE CASCADE,
  FOREIGN KEY (farmer_id)  REFERENCES farmers(id) ON DELETE CASCADE,
  FOREIGN KEY (centre_id)  REFERENCES centres(id)
);

-- ---------------------------------------------------------------- 6
CREATE TABLE IF NOT EXISTS notifications (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  farmer_id  INTEGER NOT NULL,
  title      TEXT    NOT NULL,
  message    TEXT    NOT NULL,
  type       TEXT    NOT NULL DEFAULT 'info',     -- info | success | warning
  is_read    INTEGER NOT NULL DEFAULT 0,
  created_at TEXT    NOT NULL DEFAULT (datetime('now','localtime')),
  FOREIGN KEY (farmer_id) REFERENCES farmers(id) ON DELETE CASCADE
);

-- ---------------------------------------------------------------- 7
CREATE TABLE IF NOT EXISTS crop_info (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  slug         TEXT NOT NULL UNIQUE,
  name_en      TEXT NOT NULL,
  name_hi      TEXT NOT NULL,
  name_mr      TEXT NOT NULL,
  season       TEXT NOT NULL,
  cultivation  TEXT NOT NULL,
  soil         TEXT NOT NULL,
  irrigation   TEXT NOT NULL,
  harvest      TEXT NOT NULL,
  storage      TEXT NOT NULL,
  issues       TEXT NOT NULL,
  precautions  TEXT NOT NULL,
  msp_note     TEXT
);

-- ---------------------------------------------------------------- 8
CREATE TABLE IF NOT EXISTS admins (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  username      TEXT NOT NULL UNIQUE,
  name          TEXT NOT NULL,
  password_hash TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_req_farmer  ON procurement_requests(farmer_id);
CREATE INDEX IF NOT EXISTS idx_txn_farmer  ON transactions(farmer_id);
CREATE INDEX IF NOT EXISTS idx_notif_farmer ON notifications(farmer_id);
