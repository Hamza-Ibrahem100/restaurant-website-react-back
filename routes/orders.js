const { v4: uuidv4 } = require('uuid');
const { db, parseOrderRow } = require('../db/database');

const router = require('express').Router();
const verifyAdmin = require('../middleware/verifyAdmin');

// GET /api/orders — fetch orders (optional ?limit=N) - Admin Only
router.get('/', verifyAdmin, (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 100;
    const rows = db.prepare('SELECT * FROM orders ORDER BY createdAt DESC LIMIT ?').all(limit);
    res.json(rows.map(parseOrderRow));
  } catch (err) {
    console.error('GET /api/orders error:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/orders/:id — fetch single order - Admin Only
router.get('/:id', verifyAdmin, (req, res) => {
  try {
    const row = db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id);
    if (!row) return res.status(404).json({ error: 'Order not found' });
    res.json(parseOrderRow(row));
  } catch (err) {
    console.error('GET /api/orders/:id error:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/orders — place a new order
router.post('/', (req, res) => {
  try {
    const {
      customerName, phone, email, orderType = 'pickup',
      tableNumber, deliveryAddress, items, financials,
      paymentMethod = 'cash', status = 'pending'
    } = req.body;

    if (!customerName || !items || !financials) {
      return res.status(400).json({ error: 'customerName, items, and financials are required' });
    }

    const id = uuidv4();
    const now = Date.now();

    db.prepare(`
      INSERT INTO orders (id, customerName, phone, email, orderType, tableNumber, deliveryAddress, items, financials, paymentMethod, status, createdAt)
      VALUES (@id, @customerName, @phone, @email, @orderType, @tableNumber, @deliveryAddress, @items, @financials, @paymentMethod, @status, @createdAt)
    `).run({
      id,
      customerName,
      phone: phone || null,
      email: email || null,
      orderType,
      tableNumber: tableNumber ? String(tableNumber) : null,
      deliveryAddress: deliveryAddress ? JSON.stringify(deliveryAddress) : null,
      items: JSON.stringify(items),
      financials: JSON.stringify(financials),
      paymentMethod,
      status,
      createdAt: now
    });

    const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(id);
    res.status(201).json(parseOrderRow(order));
  } catch (err) {
    console.error('POST /api/orders error:', err);
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/orders/:id/status — update order status - Admin Only
router.put('/:id/status', verifyAdmin, (req, res) => {
  try {
    const { id } = req.params;
    const { status, stripeSessionId, paidAt } = req.body;

    if (!status) return res.status(400).json({ error: 'status is required' });

    const existing = db.prepare('SELECT * FROM orders WHERE id = ?').get(id);
    if (!existing) return res.status(404).json({ error: 'Order not found' });

    db.prepare(`
      UPDATE orders SET
        status          = @status,
        stripeSessionId = COALESCE(@stripeSessionId, stripeSessionId),
        paidAt          = COALESCE(@paidAt, paidAt),
        updatedAt       = @updatedAt
      WHERE id = @id
    `).run({
      id, status,
      stripeSessionId: stripeSessionId || null,
      paidAt: paidAt || null,
      updatedAt: Date.now()
    });

    const updated = db.prepare('SELECT * FROM orders WHERE id = ?').get(id);
    res.json(parseOrderRow(updated));
  } catch (err) {
    console.error('PUT /api/orders/:id/status error:', err);
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/orders/:id — general update (for dashboard) - Admin Only
router.put('/:id', verifyAdmin, (req, res) => {
  try {
    const { id } = req.params;
    const existing = db.prepare('SELECT * FROM orders WHERE id = ?').get(id);
    if (!existing) return res.status(404).json({ error: 'Order not found' });

    const { status } = req.body;
    if (status) {
      db.prepare('UPDATE orders SET status = ?, updatedAt = ? WHERE id = ?').run(status, Date.now(), id);
    }

    const updated = db.prepare('SELECT * FROM orders WHERE id = ?').get(id);
    res.json(parseOrderRow(updated));
  } catch (err) {
    console.error('PUT /api/orders/:id error:', err);
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/orders/:id - Admin Only
router.delete('/:id', verifyAdmin, (req, res) => {
  try {
    const result = db.prepare('DELETE FROM orders WHERE id = ?').run(req.params.id);
    if (result.changes === 0) return res.status(404).json({ error: 'Not found' });
    res.json({ deleted: req.params.id });
  } catch (err) {
    console.error('DELETE /api/orders/:id error:', err);
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/orders/bulk - Admin Only
router.delete('/bulk', verifyAdmin, (req, res) => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'ids array required' });
    }
    const placeholders = ids.map(() => '?').join(',');
    db.prepare(`DELETE FROM orders WHERE id IN (${placeholders})`).run(...ids);
    res.json({ deleted: ids.length });
  } catch (err) {
    console.error('DELETE /api/orders/bulk error:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
