const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

// Ensure db directory exists
const dbDir = path.join(__dirname);
if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true });

const DB_PATH = path.join(__dirname, 'restaurant.db');
const db = new Database(DB_PATH);

// Enable WAL mode for better concurrent read performance
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// ─── Schema ───────────────────────────────────────────────────────────────────

db.exec(`
  CREATE TABLE IF NOT EXISTS menu (
    id          TEXT PRIMARY KEY,
    name        TEXT NOT NULL,
    price       REAL NOT NULL,
    category    TEXT NOT NULL DEFAULT 'mains',
    description TEXT DEFAULT '',
    image       TEXT DEFAULT '',
    thumbnail   TEXT DEFAULT '',
    is_available INTEGER NOT NULL DEFAULT 1,
    is_hidden   INTEGER NOT NULL DEFAULT 0,
    stock       INTEGER NOT NULL DEFAULT 20,
    createdAt   INTEGER NOT NULL DEFAULT (strftime('%s','now') * 1000),
    updatedAt   INTEGER
  );

  CREATE TABLE IF NOT EXISTS orders (
    id              TEXT PRIMARY KEY,
    customerName    TEXT NOT NULL,
    phone           TEXT,
    email           TEXT,
    orderType       TEXT NOT NULL DEFAULT 'pickup',
    tableNumber     TEXT,
    deliveryAddress TEXT,
    items           TEXT NOT NULL DEFAULT '[]',
    financials      TEXT NOT NULL DEFAULT '{}',
    paymentMethod   TEXT NOT NULL DEFAULT 'cash',
    status          TEXT NOT NULL DEFAULT 'pending',
    stripeSessionId TEXT,
    paidAt          INTEGER,
    createdAt       INTEGER NOT NULL DEFAULT (strftime('%s','now') * 1000),
    updatedAt       INTEGER
  );

  CREATE TABLE IF NOT EXISTS reservations (
    id        TEXT PRIMARY KEY,
    name      TEXT NOT NULL,
    email     TEXT NOT NULL,
    phone     TEXT NOT NULL,
    party     INTEGER NOT NULL DEFAULT 2,
    date      TEXT NOT NULL,
    time      TEXT NOT NULL,
    requests  TEXT DEFAULT '',
    status    TEXT NOT NULL DEFAULT 'pending',
    createdAt INTEGER NOT NULL DEFAULT (strftime('%s','now') * 1000),
    updatedAt INTEGER
  );

  CREATE TABLE IF NOT EXISTS users (
    id             TEXT PRIMARY KEY,
    name           TEXT NOT NULL,
    email          TEXT NOT NULL,
    phone          TEXT DEFAULT '',
    address        TEXT DEFAULT '',
    loyalty_points INTEGER NOT NULL DEFAULT 0,
    createdAt      INTEGER NOT NULL DEFAULT (strftime('%s','now') * 1000),
    updatedAt      INTEGER
  );

  CREATE TABLE IF NOT EXISTS authorized_users (
    id        TEXT PRIMARY KEY,
    email     TEXT NOT NULL UNIQUE,
    addedAt   INTEGER NOT NULL DEFAULT (strftime('%s','now') * 1000)
  );

  -- OTP password-reset codes
  -- otp_hash   : SHA-256 hex of the 6-digit code (never store plain-text)
  -- expires_at : Unix ms timestamp; OTP invalid after this
  -- attempts   : wrong-code submissions so far (blocked after 5)
  -- req_count  : OTPs sent to this email in the current rate-limit window
  -- last_req_at: ms timestamp of the most recent send (for rate limiting)
  CREATE TABLE IF NOT EXISTS otps (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    email       TEXT    NOT NULL,
    otp_hash    TEXT    NOT NULL,
    expires_at  INTEGER NOT NULL,
    attempts    INTEGER NOT NULL DEFAULT 0,
    req_count   INTEGER NOT NULL DEFAULT 1,
    last_req_at INTEGER NOT NULL,
    created_at  INTEGER NOT NULL DEFAULT (strftime('%s','now') * 1000)
  );
`);

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Parse JSON fields on a row object (orders.items, orders.financials,
 * orders.deliveryAddress) so callers always get plain JS objects.
 */
function parseOrderRow(row) {
  if (!row) return null;
  return {
    ...row,
    items: JSON.parse(row.items || '[]'),
    financials: JSON.parse(row.financials || '{}'),
    deliveryAddress: row.deliveryAddress ? JSON.parse(row.deliveryAddress) : null,
    is_available: undefined,  // not on orders
    // booleans
  };
}

function parseMenuRow(row) {
  if (!row) return null;
  return {
    ...row,
    is_available: row.is_available === 1,
    is_hidden: row.is_hidden === 1,
  };
}

module.exports = { db, parseOrderRow, parseMenuRow };
