/**
 * leads.controller.js — HTTP layer (Week 3).
 * Identical to Week 2 except health() mentions MongoDB storage.
 * Routes, validation, and response shape are unchanged — that is the whole point.
 */

const service = require('../services/leads.service');
const { validateCreate, validatePatch, validateReplace } = require('../validators/lead.validator');
const { sendSuccess } = require('../utils/respond');
const ApiError = require('../utils/ApiError');

const health = (req, res) => {
  sendSuccess(res, 200, {
    status:  'ok',
    uptime:  process.uptime().toFixed(2) + 's',
    storage: 'MongoDB (Mongoose)',
    week:    3,
  });
};

const getAll = async (req, res, next) => {
  try {
    const leads = await service.getAll({ status: req.query.status, search: req.query.search });
    sendSuccess(res, 200, leads, { count: leads.length });
  } catch (err) { next(err); }
};

const getOne = async (req, res, next) => {
  try {
    const lead = await service.getById(req.params.id);
    sendSuccess(res, 200, lead);
  } catch (err) { next(err); }
};

const create = async (req, res, next) => {
  try {
    const errors = validateCreate(req.body);
    if (errors.length) throw new ApiError(422, 'VALIDATION_ERROR', 'Validation failed. Please check the highlighted fields.', errors);
    const lead = await service.createLead(req.body);
    sendSuccess(res, 201, lead);
  } catch (err) { next(err); }
};

const patch = async (req, res, next) => {
  try {
    const errors = validatePatch(req.body);
    if (errors.length) throw new ApiError(422, 'VALIDATION_ERROR', 'Validation failed.', errors);
    const lead = await service.patchLead(req.params.id, req.body);
    sendSuccess(res, 200, lead);
  } catch (err) { next(err); }
};

const replace = async (req, res, next) => {
  try {
    const errors = validateReplace(req.body);
    if (errors.length) throw new ApiError(422, 'VALIDATION_ERROR', 'Validation failed.', errors);
    const lead = await service.replaceLead(req.params.id, req.body);
    sendSuccess(res, 200, lead);
  } catch (err) { next(err); }
};

const remove = async (req, res, next) => {
  try {
    await service.deleteLead(req.params.id);
    res.status(204).send();
  } catch (err) { next(err); }
};

module.exports = { health, getAll, getOne, create, patch, replace, remove };
