const path = require('path');
const fs = require('fs');

let db = null;
let parseOrderRow = () => null;
let parseMenuRow = () => null;

try {
  // Only try to load better-sqlite3 if it exists (local dev only)
  let Database;
  try {
    Database = require('better-sqlite3');
  } catch (e) {
    console.log('⚠️ better-sqlite3 not available');
    Database = null;
  }
  
  if (Database) {
    const dbDir = path.join(__dirname);
    if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true });

    const DB_PATH = path.join(__dirname, 'restaurant.db');
    db = new Database(DB_PATH);

    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');

    db.exec(`
      CREATE TABLE IF NOT EXISTS menu (
        id TEXT PRIMARY KEY, name TEXT NOT NULL, price REAL NOT NULL,
        category TEXT NOT NULL DEFAULT 'mains', description TEXT DEFAULT '',
        image TEXT DEFAULT '', thumbnail TEXT DEFAULT '',
        is_available INTEGER NOT NULL DEFAULT 1, is_hidden INTEGER NOT NULL DEFAULT 0,
        stock INTEGER NOT NULL DEFAULT 20,
        createdAt INTEGER NOT NULL DEFAULT (strftime('%s','now') * 1000), updatedAt INTEGER
      );
      CREATE TABLE IF NOT EXISTS orders (
        id TEXT PRIMARY KEY, customerName TEXT NOT NULL, phone TEXT, email TEXT,
        orderType TEXT NOT NULL DEFAULT 'pickup', tableNumber TEXT, deliveryAddress TEXT,
        items TEXT NOT NULL DEFAULT '[]', financials TEXT NOT NULL DEFAULT '{}',
        paymentMethod TEXT NOT NULL DEFAULT 'cash', status TEXT NOT NULL DEFAULT 'pending',
        stripeSessionId TEXT, paidAt INTEGER,
        createdAt INTEGER NOT NULL DEFAULT (strftime('%s','now') * 1000), updatedAt INTEGER
      );
      CREATE TABLE IF NOT EXISTS reservations (
        id TEXT PRIMARY KEY, name TEXT NOT NULL, email TEXT NOT NULL, phone TEXT NOT NULL,
        party INTEGER NOT NULL DEFAULT 2, date TEXT NOT NULL, time TEXT NOT NULL,
        requests TEXT DEFAULT '', status TEXT NOT NULL DEFAULT 'pending',
        createdAt INTEGER NOT NULL DEFAULT (strftime('%s','now') * 1000), updatedAt INTEGER
      );
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY, name TEXT NOT NULL, email TEXT NOT NULL, phone TEXT DEFAULT '',
        address TEXT DEFAULT '', loyalty_points INTEGER NOT NULL DEFAULT 0,
        createdAt INTEGER NOT NULL DEFAULT (strftime('%s','now') * 1000), updatedAt INTEGER
      );
      CREATE TABLE IF NOT EXISTS authorized_users (
        id TEXT PRIMARY KEY, email TEXT UNIQUE,
        addedAt INTEGER NOT NULL DEFAULT (strftime('%s','now') * 1000)
      );
    `);

    parseOrderRow = (row) => row ? { ...row, items: JSON.parse(row.items || '[]'), financials: JSON.parse(row.financials || '{}'), deliveryAddress: row.deliveryAddress ? JSON.parse(row.deliveryAddress) : null } : null;
    parseMenuRow = (row) => row ? { ...row, is_available: row.is_available === 1, is_hidden: row.is_hidden === 1 } : null;
    
    console.log('✅ SQLite database loaded');
  }
} catch (err) {
  console.log('⚠️ Database init error:', err.message);
}

module.exports = { db, parseOrderRow, parseMenuRow };