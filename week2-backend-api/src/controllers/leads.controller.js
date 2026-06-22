/**
 * leads.controller.js — HTTP layer only.
 *
 * Each function: reads req → calls service/validator → sends res.
 * All try/catch passes errors to next() so the centralized errorHandler handles them.
 * Controllers NEVER touch the store directly.
 */

const service = require('../services/leads.service');
const { validateCreate, validatePatch, validateReplace } = require('../validators/lead.validator');
const { sendSuccess, sendError } = require('../utils/respond');
const ApiError = require('../utils/ApiError');

// GET /api/health
const health = (req, res) => {
  sendSuccess(res, 200, {
    status:  'ok',
    uptime:  process.uptime().toFixed(2) + 's',
    storage: 'in-memory',
    week:    2,
  });
};

// GET /api/leads
const getAll = async (req, res, next) => {
  try {
    const leads = await service.getAll({ status: req.query.status, search: req.query.search });
    sendSuccess(res, 200, leads, { count: leads.length });
  } catch (err) { next(err); }
};

// GET /api/leads/:id
const getOne = async (req, res, next) => {
  try {
    const lead = await service.getById(req.params.id);
    sendSuccess(res, 200, lead);
  } catch (err) { next(err); }
};

// POST /api/leads
const create = async (req, res, next) => {
  try {
    const errors = validateCreate(req.body);
    if (errors.length) throw new ApiError(422, 'VALIDATION_ERROR', 'Validation failed. Please check the highlighted fields.', errors);
    const lead = await service.createLead(req.body);
    sendSuccess(res, 201, lead);
  } catch (err) { next(err); }
};

// PATCH /api/leads/:id
const patch = async (req, res, next) => {
  try {
    const errors = validatePatch(req.body);
    if (errors.length) throw new ApiError(422, 'VALIDATION_ERROR', 'Validation failed.', errors);
    const lead = await service.patchLead(req.params.id, req.body);
    sendSuccess(res, 200, lead);
  } catch (err) { next(err); }
};

// PUT /api/leads/:id
const replace = async (req, res, next) => {
  try {
    const errors = validateReplace(req.body);
    if (errors.length) throw new ApiError(422, 'VALIDATION_ERROR', 'Validation failed.', errors);
    const lead = await service.replaceLead(req.params.id, req.body);
    sendSuccess(res, 200, lead);
  } catch (err) { next(err); }
};

// DELETE /api/leads/:id
const remove = async (req, res, next) => {
  try {
    await service.deleteLead(req.params.id);
    res.status(204).send();           // 204 No Content — success, no body
  } catch (err) { next(err); }
};

module.exports = { health, getAll, getOne, create, patch, replace, remove };
