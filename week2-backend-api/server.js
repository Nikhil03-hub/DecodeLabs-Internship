/**
 * server.js — entry point.
 * Separating app.js (Express app) from server.js (HTTP listener) is a professional
 * pattern: it lets you test app.js without starting a real server.
 */

const app  = require('./src/app');
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log('\n🚀 Nexus AI Leads API (Week 2 — In-Memory Storage)');
  console.log(`   Listening on http://localhost:${PORT}`);
  console.log(`   Health:      GET  http://localhost:${PORT}/api/health`);
  console.log(`   Leads list:  GET  http://localhost:${PORT}/api/leads`);
  console.log(`   Create lead: POST http://localhost:${PORT}/api/leads\n`);
});
