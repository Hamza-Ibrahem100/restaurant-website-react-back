const { v4: uuidv4 } = require('uuid');
const { db } = require('../db/database');

const router = require('express').Router();
const verifyAdmin = require('../middleware/verifyAdmin');

// GET /api/reservations - Admin Only
router.get('/', verifyAdmin, (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 100;
    const rows = db.prepare('SELECT * FROM reservations ORDER BY createdAt DESC LIMIT ?').all(limit);
    res.json(rows);
  } catch (err) {
    console.error('GET /api/reservations error:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/reservations — submit a reservation
router.post('/', (req, res) => {
  try {
    const { name, email, phone, party, date, time, requests = '', status = 'pending' } = req.body;
    if (!name || !email || !phone || !date || !time) {
      return res.status(400).json({ error: 'name, email, phone, date, and time are required' });
    }

    const id = uuidv4();
    const now = Date.now();

    db.prepare(`
      INSERT INTO reservations (id, name, email, phone, party, date, time, requests, status, createdAt)
      VALUES (@id, @name, @email, @phone, @party, @date, @time, @requests, @status, @createdAt)
    `).run({ id, name, email, phone, party: parseInt(party) || 2, date, time, requests, status, createdAt: now });

    const reservation = db.prepare('SELECT * FROM reservations WHERE id = ?').get(id);
    res.status(201).json(reservation);
  } catch (err) {
    console.error('POST /api/reservations error:', err);
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/reservations/:id/status — update status - Admin Only
router.put('/:id/status', verifyAdmin, (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    if (!status) return res.status(400).json({ error: 'status is required' });

    const existing = db.prepare('SELECT id FROM reservations WHERE id = ?').get(id);
    if (!existing) return res.status(404).json({ error: 'Reservation not found' });

    db.prepare('UPDATE reservations SET status = ?, updatedAt = ? WHERE id = ?')
      .run(status, Date.now(), id);

    res.json(db.prepare('SELECT * FROM reservations WHERE id = ?').get(id));
  } catch (err) {
    console.error('PUT /api/reservations/:id/status error:', err);
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/reservations/:id — general update - Admin Only
router.put('/:id', verifyAdmin, (req, res) => {
  try {
    const { id } = req.params;
    const existing = db.prepare('SELECT id FROM reservations WHERE id = ?').get(id);
    if (!existing) return res.status(404).json({ error: 'Reservation not found' });

    const { status } = req.body;
    if (status) {
      db.prepare('UPDATE reservations SET status = ?, updatedAt = ? WHERE id = ?')
        .run(status, Date.now(), id);
    }

    res.json(db.prepare('SELECT * FROM reservations WHERE id = ?').get(id));
  } catch (err) {
    console.error('PUT /api/reservations/:id error:', err);
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/reservations/:id - Admin Only
router.delete('/:id', verifyAdmin, (req, res) => {
  try {
    const result = db.prepare('DELETE FROM reservations WHERE id = ?').run(req.params.id);
    if (result.changes === 0) return res.status(404).json({ error: 'Not found' });
    res.json({ deleted: req.params.id });
  } catch (err) {
    console.error('DELETE /api/reservations/:id error:', err);
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/reservations/bulk - Admin Only
router.delete('/bulk', verifyAdmin, (req, res) => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'ids array required' });
    }
    const placeholders = ids.map(() => '?').join(',');
    db.prepare(`DELETE FROM reservations WHERE id IN (${placeholders})`).run(...ids);
    res.json({ deleted: ids.length });
  } catch (err) {
    console.error('DELETE /api/reservations/bulk error:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
