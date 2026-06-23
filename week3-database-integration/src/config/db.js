/**
 * db.js — MongoDB connection via Mongoose.
 *
 * Mongoose is an ODM (Object-Document Mapper) — it lets us work with MongoDB
 * using JavaScript objects and schemas instead of raw MongoDB queries.
 *
 * Connection is called once from server.js at startup. Mongoose internally
 * manages a connection pool, so we call connect() once and it handles the rest.
 */

const mongoose = require('mongoose');

const connectDB = async () => {
  const uri = process.env.MONGO_URI;
  if (!uri) {
    console.error('❌  MONGO_URI is not set. Copy .env.example → .env and fill it in.');
    process.exit(1);
  }

  try {
    const conn = await mongoose.connect(uri);
    console.log(`✅  MongoDB connected: ${conn.connection.host}`);
  } catch (err) {
    console.error('❌  MongoDB connection error:', err.message);
    process.exit(1);   // crash hard — the app can't function without a DB
  }
};

module.exports = connectDB;
