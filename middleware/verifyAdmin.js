const admin = require('../firebaseAdmin');
const { db } = require('../db/database');

// Middleware to verify if the user has admin privileges
const verifyAdmin = async (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1]; // Expecting "Bearer <token>"

  if (!token) {
    return res.status(401).json({ message: "Unauthorized: Missing token" });
  }

  try {
    // 1. Verify the token using Firebase Admin
    const decodedToken = await admin.auth().verifyIdToken(token);
    const email = decodedToken.email?.toLowerCase();
    
    if (!email) {
      return res.status(403).json({ message: "Forbidden: No email associated with token" });
    }

    // 2. Check if the user is the primary admin
    if (email === 'hamzaelsharkh@gmail.com') {
      req.user = decodedToken;
      return next(); // Proceed to the next middleware/route handler
    }

    // 3. Check if the email exists in the authorized_users SQLite database
    const row = db.prepare('SELECT id FROM authorized_users WHERE email = ?').get(email);
    
    if (row) {
      req.user = decodedToken;
      return next(); // Proceed
    }

    // If neither check passed, deny access
    res.status(403).json({ message: "Forbidden: Admin access required" });
  } catch (error) {
    console.error('verifyAdmin error:', error);
    res.status(401).json({ message: "Unauthorized: Invalid or expired token" });
  }
};

module.exports = verifyAdmin;
