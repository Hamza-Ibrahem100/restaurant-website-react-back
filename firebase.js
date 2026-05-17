const { initializeApp } = require('firebase/app');
const { getDatabase } = require('firebase/database');

const firebaseConfig = {
  apiKey: "AIzaSyAR2z1DEr1OY5MbRDQxWM7OBQ8Ou-au25s",
  authDomain: "restaurant-food-lover.firebaseapp.com",
  projectId: "restaurant-food-lover",
  storageBucket: "restaurant-food-lover.firebasestorage.app",
  messagingSenderId: "835872524416",
  appId: "1:835872524416:web:39c7f3444c82090e133e65",
  databaseURL: "https://restaurant-food-lover-default-rtdb.firebaseio.com"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

module.exports = { app, db };