const admin = require('firebase-admin');
const path = require('path');

// Load the service account key from the local JSON file.
// This avoids all .env newline-escaping issues with private keys.
try {
  const serviceAccount = require(path.join(__dirname, 'serviceAccount.json'));

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });

  console.log('🔥 Firebase Admin initialized successfully');
} catch (error) {
  console.error('🔥 Firebase Admin initialization failed:', error.message);
}

module.exports = admin;
