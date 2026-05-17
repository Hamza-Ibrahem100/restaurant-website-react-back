const { v4: uuidv4 } = require('uuid');
const { db } = require('../db/database');
const admin = require('../firebaseAdmin');
const { sendResetEmail } = require('../emailService');

const router = require('express').Router();

// GET /api/users
router.get('/', (req, res) => {
  try {
    const rows = db.prepare('SELECT * FROM users ORDER BY createdAt DESC').all();
    res.json(rows);
  } catch (err) {
    console.error('GET /api/users error:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/users — add user
router.post('/', (req, res) => {
  try {
    const { name, email, phone = '', address = '', loyalty_points = 0 } = req.body;
    if (!name || !email) return res.status(400).json({ error: 'name and email are required' });

    const id = uuidv4();
    const now = Date.now();

    db.prepare(`
      INSERT INTO users (id, name, email, phone, address, loyalty_points, createdAt)
      VALUES (@id, @name, @email, @phone, @address, @loyalty_points, @createdAt)
    `).run({ id, name, email, phone, address, loyalty_points: parseInt(loyalty_points) || 0, createdAt: now });

    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
    res.status(201).json(user);
  } catch (err) {
    console.error('POST /api/users error:', err);
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/users/:id — update user
router.put('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const existing = db.prepare('SELECT id FROM users WHERE id = ?').get(id);
    if (!existing) return res.status(404).json({ error: 'User not found' });

    const { name, email, phone, address, loyalty_points } = req.body;

    db.prepare(`
      UPDATE users SET
        name           = COALESCE(@name, name),
        email          = COALESCE(@email, email),
        phone          = COALESCE(@phone, phone),
        address        = COALESCE(@address, address),
        loyalty_points = COALESCE(@loyalty_points, loyalty_points),
        updatedAt      = @updatedAt
      WHERE id = @id
    `).run({
      id,
      name: name ?? null,
      email: email ?? null,
      phone: phone ?? null,
      address: address ?? null,
      loyalty_points: loyalty_points !== undefined ? parseInt(loyalty_points) : null,
      updatedAt: Date.now()
    });

    res.json(db.prepare('SELECT * FROM users WHERE id = ?').get(id));
  } catch (err) {
    console.error('PUT /api/users/:id error:', err);
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/users/:id
router.delete('/:id', (req, res) => {
  try {
    const result = db.prepare('DELETE FROM users WHERE id = ?').run(req.params.id);
    if (result.changes === 0) return res.status(404).json({ error: 'Not found' });
    res.json({ deleted: req.params.id });
  } catch (err) {
    console.error('DELETE /api/users/:id error:', err);
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/users/bulk
router.delete('/bulk', (req, res) => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'ids array required' });
    }
    const placeholders = ids.map(() => '?').join(',');
    db.prepare(`DELETE FROM users WHERE id IN (${placeholders})`).run(...ids);
    res.json({ deleted: ids.length });
  } catch (err) {
    console.error('DELETE /api/users/bulk error:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/users/forgot-password
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email is required' });

    // 1. Generate the reset link using Firebase Admin
    if (!admin) {
       return res.status(500).json({ error: 'Firebase Admin SDK is not properly configured on the server.' });
    }
    
    // Check if the user exists in Firebase Auth before generating the link
    try {
      await admin.auth().getUserByEmail(email);
    } catch (e) {
      if (e.code === 'auth/user-not-found') {
        // For security, do not reveal if the user exists or not.
        // Pretend it succeeded.
        return res.status(200).json({ message: 'If the email exists, a reset link was sent.' });
      }
      throw e;
    }

    const resetLink = await admin.auth().generatePasswordResetLink(email);

    // 2. Send the email using Nodemailer
    await sendResetEmail(email, resetLink);

    res.status(200).json({ message: 'If the email exists, a reset link was sent.' });
  } catch (err) {
    console.error('POST /api/users/forgot-password error:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
