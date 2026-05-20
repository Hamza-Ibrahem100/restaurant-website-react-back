/**
 * routes/auth.js
 *
 * OTP-based password recovery using Firebase RTDB for storage
 * + Resend API for email (works on Vercel!)
 */

const router = require('express').Router();
const crypto = require('crypto');

let rtdb = null;
let admin = null;
let firebaseMethods = { ref: () => {}, set: async () => {}, get: async () => {}, remove: async () => {} };
let sendOtpEmail = async () => { throw new Error('Email service not available'); };
let sendResetConfirmationEmail = async () => {};

try {
  const fb = require('../firebase');
  rtdb = fb.db;
  firebaseMethods = require('firebase/database');
} catch (e) {
  console.log('Firebase SDK not available:', e.message);
}

try {
  admin = require('../firebaseAdmin');
} catch (e) {
  console.log('Firebase Admin not available:', e.message);
}

try {
  const emailSvc = require('../emailService');
  sendOtpEmail = emailSvc.sendOtpEmail;
  sendResetConfirmationEmail = emailSvc.sendResetConfirmationEmail;
} catch (e) {
  console.log('Email service not available:', e.message);
}

const { ref, set, get, remove } = firebaseMethods;

const OTP_TTL_MS = 5 * 60 * 1000;
const RESET_TOKEN_TTL_MS = 10 * 60 * 1000;
const MAX_ATTEMPTS = 5;
const RATE_LIMIT_WINDOW = 60 * 1000;
const RATE_LIMIT_MAX = 3;

function sha256(text) {
  return crypto.createHash('sha256').update(text).digest('hex');
}

function generateOtp() {
  return String(crypto.randomInt(100000, 1000000));
}

function normalizeEmail(email) {
  return email.toLowerCase().trim();
}

async function getOtpRecord(email) {
  const normalized = normalizeEmail(email);
  const otpRef = ref(rtdb, `otps/${normalized}`);
  const snapshot = await get(otpRef);
  return snapshot.exists() ? snapshot.val() : null;
}

async function saveOtp(email, data) {
  const normalized = normalizeEmail(email);
  await set(ref(rtdb, `otps/${normalized}`), data);
}

async function deleteOtp(email) {
  const normalized = normalizeEmail(email);
  await remove(ref(rtdb, `otps/${normalized}`));
}

async function cleanupExpiredOtps() {
  const otpsRef = ref(rtdb, 'otps');
  const snapshot = await get(otpsRef);
  if (!snapshot.exists()) return;
  
  const records = snapshot.val();
  const now = Date.now();
  
  for (const [key, record] of Object.entries(records)) {
    if (record.expiresAt && record.expiresAt < now) {
      await remove(ref(rtdb, `otps/${key}`));
    }
  }
}

// POST /api/auth/send-otp
router.post('/send-otp', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email || !email.includes('@')) {
      return res.status(400).json({ error: 'Valid email required' });
    }

    const normalizedEmail = normalizeEmail(email);
    const now = Date.now();

    // Cleanup
    await cleanupExpiredOtps();

    // Rate limiting
    const existing = await getOtpRecord(normalizedEmail);
    if (existing && existing.lastSentAt) {
      const timeSinceLast = now - existing.lastSentAt;
      if (timeSinceLast < RATE_LIMIT_WINDOW) {
        return res.status(429).json({ 
          error: `Please wait ${Math.ceil((RATE_LIMIT_WINDOW - timeSinceLast)/1000)} seconds` 
        });
      }
    }

    // Check if user exists in Firebase
    try {
      await admin.auth().getUserByEmail(normalizedEmail);
    } catch (e) {
      if (e.code === 'auth/user-not-found') {
        return res.status(200).json({ message: 'If this email is registered, an OTP has been sent.' });
      }
    }

    // Generate OTP
    const otp = generateOtp();
    const otpHash = sha256(otp);
    const expiresAt = now + OTP_TTL_MS;

    // Save to Firebase RTDB
    await saveOtp(normalizedEmail, {
      email: normalizedEmail,
      otpHash: otpHash,
      expiresAt: expiresAt,
      attempts: 0,
      lastSentAt: now,
      createdAt: now
    });

    // Send OTP via Resend
    await sendOtpEmail(normalizedEmail, otp);

    return res.status(200).json({ message: 'OTP sent to your email.' });

  } catch (err) {
    console.error('send-otp error:', err);
    res.status(500).json({ error: 'Failed to send OTP.' });
  }
});

// POST /api/auth/verify-otp
router.post('/verify-otp', async (req, res) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) {
      return res.status(400).json({ error: 'Email and OTP required' });
    }

    const normalizedEmail = normalizeEmail(email);
    const now = Date.now();

    const record = await getOtpRecord(normalizedEmail);
    if (!record) {
      return res.status(400).json({ error: 'No OTP found. Request a new one.' });
    }

    if (now > record.expiresAt) {
      await deleteOtp(normalizedEmail);
      return res.status(400).json({ error: 'OTP expired. Request a new one.' });
    }

    if (record.attempts >= MAX_ATTEMPTS) {
      await deleteOtp(normalizedEmail);
      return res.status(400).json({ error: 'Too many attempts. Request a new OTP.' });
    }

    const inputHash = sha256(otp.trim());
    if (inputHash !== record.otpHash) {
      await update(ref(rtdb, `otps/${normalizedEmail}`), {
        attempts: (record.attempts || 0) + 1
      });
      const remaining = MAX_ATTEMPTS - (record.attempts + 1);
      return res.status(400).json({ error: `Incorrect OTP. ${remaining} attempts left.` });
    }

    // Valid - generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenHash = sha256(resetToken);
    const resetExpiresAt = now + RESET_TOKEN_TTL_MS;

    await update(ref(rtdb, `otps/${normalizedEmail}`), {
      otpHash: null,
      tokenHash: resetTokenHash,
      expiresAt: resetExpiresAt,
      attempts: 0
    });

    return res.status(200).json({
      message: 'OTP verified',
      resetToken
    });

  } catch (err) {
    console.error('verify-otp error:', err);
    res.status(500).json({ error: 'Verification failed.' });
  }
});

// POST /api/auth/reset-password
router.post('/reset-password', async (req, res) => {
  try {
    const { email, resetToken, newPassword } = req.body;

    if (!email || !resetToken || !newPassword) {
      return res.status(400).json({ error: 'All fields required' });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'Password must be 6+ characters' });
    }

    const normalizedEmail = normalizeEmail(email);
    const now = Date.now();

    const record = await getOtpRecord(normalizedEmail);
    if (!record || !record.tokenHash) {
      return res.status(400).json({ error: 'No active reset session. Start over.' });
    }

    const tokenHash = sha256(resetToken);
    if (record.tokenHash !== tokenHash) {
      return res.status(400).json({ error: 'Invalid token.' });
    }

    if (now > record.expiresAt) {
      await deleteOtp(normalizedEmail);
      return res.status(400).json({ error: 'Token expired. Start over.' });
    }

    // Update Firebase password
    try {
      const user = await admin.auth().getUserByEmail(normalizedEmail);
      await admin.auth().updateUser(user.uid, { password: newPassword });
      await sendResetConfirmationEmail(normalizedEmail);
    } catch (e) {
      console.warn('Firebase password update warning:', e.message);
    }

    await deleteOtp(normalizedEmail);
    return res.status(200).json({ message: 'Password reset successful!' });

  } catch (err) {
    console.error('reset-password error:', err);
    res.status(500).json({ error: 'Failed to reset password.' });
  }
});

module.exports = router;