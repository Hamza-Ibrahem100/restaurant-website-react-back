const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs');

let serviceAccount;

try {
  const localKeyPath = path.join(__dirname, 'serviceAccount.json');
  
  if (fs.existsSync(localKeyPath)) {
    // 1. Prefer local serviceAccount.json if it exists (local dev)
    serviceAccount = require(localKeyPath);
  } else if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    // 2. Otherwise fall back to env variable (Vercel production)
    serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
  }

  // Safety: replace double backslashes with actual newlines in private key if present
  if (serviceAccount && serviceAccount.private_key) {
    serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
  }

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: "https://restaurant-food-lover-default-rtdb.firebaseio.com"
  });

  console.log('🔥 Firebase Admin initialized successfully');
} catch (error) {
  console.error('🔥 Firebase Admin initialization failed:', error.message);
}

module.exports = admin;