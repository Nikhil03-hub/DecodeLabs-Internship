/**
 * app.js — Express application factory (Week 3, MongoDB version).
 * Same middleware stack as Week 2; only the service layer now talks to Mongoose.
 */

const express = require('express');
const cors    = require('cors');

const leadsRouter  = require('./routes/leads.routes');
const notFound     = require('./middleware/notFound');
const errorHandler = require('./middleware/errorHandler');
const { health }   = require('./controllers/leads.controller');

const app = express();

app.use(cors({
  origin: [
    'http://127.0.0.1:5500',
    'http://localhost:5500',
    'http://localhost:3001',
  ],
  methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(express.json());

app.get('/api/health', health);
app.use('/api/leads', leadsRouter);

app.use(notFound);
app.use(errorHandler);

module.exports = app;
