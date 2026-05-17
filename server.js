const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

// ── App Setup ────────────────────────────────────────────────────────────────
const app = express();
const PORT = process.env.PORT || 5000;

// ── CORS ─────────────────────────────────────────────────────────────────────
const ALLOWED_ORIGINS = [
  'http://localhost:3000',
  'http://localhost:3001',
  'https://restaurant-food-lover.vercel.app',
  process.env.FRONTEND_URL
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (e.g. curl, Postman, mobile)
    if (!origin || ALLOWED_ORIGINS.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error(`CORS policy: origin ${origin} not allowed`));
    }
  },
  credentials: true
}));

// ── Stripe Webhook MUST receive raw body — register BEFORE express.json() ────
const webhookRouter = require('./routes/webhook');
app.use('/api/stripe/webhook', express.raw({ type: 'application/json' }), webhookRouter);

// ── General Middleware ────────────────────────────────────────────────────────
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ── Serve uploaded images statically ─────────────────────────────────────────
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ── Health Check ──────────────────────────────────────────────────────────────
app.get('/', (req, res) => {
  res.json({
    status: 'ok',
    message: '🍽️ Restaurant API is running',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', db: 'sqlite', timestamp: Date.now() });
});

// ── API Routes ────────────────────────────────────────────────────────────────
app.use('/api/menu',             require('./routes/menu'));
app.use('/api/orders',           require('./routes/orders'));
app.use('/api/reservations',     require('./routes/reservations'));
app.use('/api/users',            require('./routes/users'));
app.use('/api/authorized-users', require('./routes/authorizedUsers'));
app.use('/api/upload',           require('./routes/upload'));
app.use('/api/auth',             require('./routes/auth'));

// ── 404 Handler ───────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ error: `Route ${req.method} ${req.path} not found` });
});

// ── Global Error Handler ──────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: err.message || 'Internal server error' });
});

// ── Start ─────────────────────────────────────────────────────────────────────
app.listen(PORT, '0.0.0.0', () => {
  console.log(`\n🚀 Server is running on port ${PORT}`);
  console.log(`📦 SQLite database: ./db/restaurant.db`);
  console.log(`🖼️  Uploads served at: /uploads\n`);
});