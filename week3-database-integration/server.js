/**
 * server.js — Entry point (Week 3).
 * Loads .env, connects to MongoDB, then starts the HTTP server.
 * The HTTP server only starts AFTER the DB is connected — this prevents
 * the API from accepting requests before the database is ready.
 */

require('dotenv').config();

const app       = require('./src/app');
const connectDB = require('./src/config/db');

const PORT = process.env.PORT || 3000;

const start = async () => {
  await connectDB();   // connect to MongoDB first

  app.listen(PORT, () => {
    console.log('\n🚀 Nexus AI Leads API (Week 3 — MongoDB + Mongoose)');
    console.log(`   Listening on http://localhost:${PORT}`);
    console.log(`   Health:      GET  http://localhost:${PORT}/api/health`);
    console.log(`   Leads list:  GET  http://localhost:${PORT}/api/leads`);
    console.log(`   Create lead: POST http://localhost:${PORT}/api/leads\n`);
  });
};

start();
