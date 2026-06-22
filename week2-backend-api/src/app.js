/**
 * app.js — Express application factory.
 *
 * Middleware stack (order matters):
 *   1. CORS — must come BEFORE routes so preflight OPTIONS requests are handled
 *   2. express.json() — parse request body
 *   3. Routes
 *   4. 404 handler (unmatched routes)
 *   5. Centralized error handler (must be last, 4-arg signature)
 *
 * CORS explanation:
 *   When the frontend (http://127.0.0.1:5500) sends a request to this backend
 *   (http://localhost:3000), the browser's Same-Origin Policy blocks it because
 *   the ports differ (different origin). The browser first sends an invisible
 *   OPTIONS preflight request to ask permission. Our CORS middleware responds with
 *   the correct Access-Control-Allow-* headers so the browser allows the real request.
 */

const express = require('express');
const cors    = require('cors');

const leadsRouter  = require('./routes/leads.routes');
const notFound     = require('./middleware/notFound');
const errorHandler = require('./middleware/errorHandler');
const { health }   = require('./controllers/leads.controller');

const app = express();

// 1. CORS — allow the Live Server frontend origin
app.use(cors({
  origin: [
    'http://127.0.0.1:5500',  // VS Code Live Server (IPv4)
    'http://localhost:5500',   // alternate Live Server address
    'http://localhost:3001',   // optional: if client is served on a different port
  ],
  methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// 2. Parse JSON bodies (400 if malformed — caught by errorHandler)
app.use(express.json());

// 3. Routes
app.get('/api/health', health);       // health check (no auth needed, used by Week 4 client)
app.use('/api/leads', leadsRouter);   // all lead CRUD

// 4. 404 handler (unmatched routes)
app.use(notFound);

// 5. Centralized error handler (MUST be last)
app.use(errorHandler);

module.exports = app;
