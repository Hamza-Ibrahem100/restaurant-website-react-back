const { v4: uuidv4 } = require('uuid');
const { db } = require('../db/database');

const router = require('express').Router();
const verifyAdmin = require('../middleware/verifyAdmin');

// GET /api/authorized-users - Admin Only
router.get('/', verifyAdmin, (req, res) => {
  try {
    const rows = db.prepare('SELECT * FROM authorized_users ORDER BY addedAt DESC').all();
    res.json(rows);
  } catch (err) {
    console.error('GET /api/authorized-users error:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/authorized-users — add one or multiple emails - Admin Only
router.post('/', verifyAdmin, (req, res) => {
  try {
    const { email, emails } = req.body;

    // Support batch (emails array) or single (email string)
    const emailList = emails
      ? (Array.isArray(emails) ? emails : [emails])
      : email
        ? [email]
        : [];

    if (emailList.length === 0) {
      return res.status(400).json({ error: 'email or emails is required' });
    }

    const now = Date.now();
    const inserted = [];

    const insertStmt = db.prepare(`
      INSERT OR IGNORE INTO authorized_users (id, email, addedAt)
      VALUES (@id, @email, @addedAt)
    `);

    const insertMany = db.transaction((list) => {
      for (const e of list) {
        const id = uuidv4();
        insertStmt.run({ id, email: e.trim().toLowerCase(), addedAt: now });
        inserted.push({ id, email: e.trim().toLowerCase(), addedAt: now });
      }
    });

    insertMany(emailList);
    res.status(201).json({ inserted: inserted.length, users: inserted });
  } catch (err) {
    console.error('POST /api/authorized-users error:', err);
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/authorized-users/:id - Admin Only
router.delete('/:id', verifyAdmin, (req, res) => {
  try {
    const result = db.prepare('DELETE FROM authorized_users WHERE id = ?').run(req.params.id);
    if (result.changes === 0) return res.status(404).json({ error: 'Not found' });
    res.json({ deleted: req.params.id });
  } catch (err) {
    console.error('DELETE /api/authorized-users/:id error:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/authorized-users/check?email=... — check if email is authorized
router.get('/check', (req, res) => {
  try {
    const { email } = req.query;
    if (!email) return res.status(400).json({ error: 'email query param required' });

    const row = db.prepare('SELECT id FROM authorized_users WHERE email = ?')
      .get(email.toLowerCase().trim());

    res.json({ authorized: !!row });
  } catch (err) {
    console.error('GET /api/authorized-users/check error:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
