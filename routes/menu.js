const { v4: uuidv4 } = require('uuid');
const { db, parseMenuRow } = require('../db/database');

const router = require('express').Router();

// GET /api/menu — fetch all menu items
router.get('/', (req, res) => {
  try {
    const rows = db.prepare('SELECT * FROM menu ORDER BY createdAt DESC').all();
    res.json(rows.map(parseMenuRow));
  } catch (err) {
    console.error('GET /api/menu error:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/menu — add a menu item
router.post('/', (req, res) => {
  try {
    const {
      name, price, category = 'mains', description = '',
      image = '', thumbnail = '', is_available = true,
      is_hidden = false, stock = 20
    } = req.body;

    if (!name || price === undefined) {
      return res.status(400).json({ error: 'name and price are required' });
    }

    const id = uuidv4();
    const now = Date.now();

    db.prepare(`
      INSERT INTO menu (id, name, price, category, description, image, thumbnail, is_available, is_hidden, stock, createdAt)
      VALUES (@id, @name, @price, @category, @description, @image, @thumbnail, @is_available, @is_hidden, @stock, @createdAt)
    `).run({
      id, name, price: parseFloat(price), category, description,
      image, thumbnail: thumbnail || image,
      is_available: is_available ? 1 : 0,
      is_hidden: is_hidden ? 1 : 0,
      stock: parseInt(stock) || 20,
      createdAt: now
    });

    const item = db.prepare('SELECT * FROM menu WHERE id = ?').get(id);
    res.status(201).json(parseMenuRow(item));
  } catch (err) {
    console.error('POST /api/menu error:', err);
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/menu/:id — update a menu item
router.put('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const existing = db.prepare('SELECT * FROM menu WHERE id = ?').get(id);
    if (!existing) return res.status(404).json({ error: 'Menu item not found' });

    const {
      name, price, category, description,
      image, thumbnail, is_available, is_hidden, stock
    } = req.body;

    db.prepare(`
      UPDATE menu SET
        name        = COALESCE(@name, name),
        price       = COALESCE(@price, price),
        category    = COALESCE(@category, category),
        description = COALESCE(@description, description),
        image       = COALESCE(@image, image),
        thumbnail   = COALESCE(@thumbnail, thumbnail),
        is_available= COALESCE(@is_available, is_available),
        is_hidden   = COALESCE(@is_hidden, is_hidden),
        stock       = COALESCE(@stock, stock),
        updatedAt   = @updatedAt
      WHERE id = @id
    `).run({
      id,
      name: name ?? null,
      price: price !== undefined ? parseFloat(price) : null,
      category: category ?? null,
      description: description ?? null,
      image: image ?? null,
      thumbnail: thumbnail ?? null,
      is_available: is_available !== undefined ? (is_available ? 1 : 0) : null,
      is_hidden: is_hidden !== undefined ? (is_hidden ? 1 : 0) : null,
      stock: stock !== undefined ? parseInt(stock) : null,
      updatedAt: Date.now()
    });

    const updated = db.prepare('SELECT * FROM menu WHERE id = ?').get(id);
    res.json(parseMenuRow(updated));
  } catch (err) {
    console.error('PUT /api/menu/:id error:', err);
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/menu/bulk — bulk delete (body: { ids: [...] })
router.delete('/bulk', (req, res) => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'ids array is required' });
    }
    const placeholders = ids.map(() => '?').join(',');
    db.prepare(`DELETE FROM menu WHERE id IN (${placeholders})`).run(...ids);
    res.json({ deleted: ids.length });
  } catch (err) {
    console.error('DELETE /api/menu/bulk error:', err);
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/menu/:id — delete a single menu item
router.delete('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const result = db.prepare('DELETE FROM menu WHERE id = ?').run(id);
    if (result.changes === 0) return res.status(404).json({ error: 'Not found' });
    res.json({ deleted: id });
  } catch (err) {
    console.error('DELETE /api/menu/:id error:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
