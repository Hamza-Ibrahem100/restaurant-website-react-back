const { db, parseOrderRow } = require('../db/database');

const router = require('express').Router();

// POST /api/stripe/webhook — Stripe sends events here after payment
// This route needs raw body (NOT JSON parsed), set in server.js
router.post('/', async (req, res) => {
  const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
  const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;

  const sig = req.headers['stripe-signature'];
  let event;

  try {
    if (STRIPE_WEBHOOK_SECRET && sig) {
      // Verify signature in production
      event = stripe.webhooks.constructEvent(req.body, sig, STRIPE_WEBHOOK_SECRET);
    } else {
      // Allow unsigned for local testing
      event = JSON.parse(req.body.toString());
    }
  } catch (err) {
    console.error(`Webhook signature error: ${err.message}`);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const orderId = session.client_reference_id;

    if (orderId) {
      try {
        const existing = db.prepare('SELECT id FROM orders WHERE id = ?').get(orderId);
        if (existing) {
          db.prepare(`
            UPDATE orders SET
              status          = 'paid',
              stripeSessionId = ?,
              paidAt          = ?,
              updatedAt       = ?
            WHERE id = ?
          `).run(session.id, Date.now(), Date.now(), orderId);

          console.log(`✅ Stripe webhook: Order ${orderId} marked as paid`);
        } else {
          console.warn(`⚠️ Stripe webhook: Order ${orderId} not found in SQLite DB`);
        }
      } catch (dbErr) {
        console.error('Stripe webhook DB error:', dbErr);
      }
    }
  }

  res.json({ received: true });
});

module.exports = router;
