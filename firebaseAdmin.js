const admin = require('firebase-admin');
const path = require('path');

let serviceAccount;

try {
  // 1. لو السيرفر شغال أونلاين على فيرسيل، هيقرأ من المتغير البيئي
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
  } else {
    // 2. لو شغال محلياً على جهازك، هيقرأ من ملف الـ JSON كالعادة
    serviceAccount = require(path.join(__dirname, 'serviceAccount.json'));
  }

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: "https://restaurant-food-lover-default-rtdb.firebaseio.com" // رابط الـ Realtime بتاعك
  });

  console.log('🔥 Firebase Admin initialized successfully');
} catch (error) {
  console.error('🔥 Firebase Admin initialization failed:', error.message);
}

module.exports = admin;