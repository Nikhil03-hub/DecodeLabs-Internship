/**
 * leads.routes.js — maps HTTP method + path → controller function.
 * Routes know only URLs; all logic lives in controllers/services.
 *
 * REST naming rule: resources are nouns (/api/leads), HTTP verbs are the action.
 * NEVER use: GET /getLeads, POST /createLead — those are bad REST.
 */

const { Router } = require('express');
const c = require('../controllers/leads.controller');

const router = Router();

router.get   ('/',    c.getAll);    // GET    /api/leads
router.post  ('/',    c.create);    // POST   /api/leads
router.get   ('/:id', c.getOne);   // GET    /api/leads/:id
router.patch ('/:id', c.patch);    // PATCH  /api/leads/:id  (partial update)
router.put   ('/:id', c.replace);  // PUT    /api/leads/:id  (full replace — idempotent)
router.delete('/:id', c.remove);   // DELETE /api/leads/:id

module.exports = router;
