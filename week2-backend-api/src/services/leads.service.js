/**
 * leads.service.js — business logic layer.
 *
 * Sits between the controller (HTTP) and the store (persistence).
 * Only this layer talks to the store. Controllers never touch the store directly.
 * This is what makes the Week 3 swap painless: Week 3 only changes the store.
 */

const store   = require('../store/leadStore');
const ApiError = require('../utils/ApiError');

const STATUS_ENUM = ['new', 'contacted', 'converted', 'rejected'];

const getAll = async (filters = {}) => {
  const { status, search } = filters;
  if (status && !STATUS_ENUM.includes(status)) {
    throw new ApiError(422, 'VALIDATION_ERROR', 'Invalid status filter.', [
      { field: 'status', message: 'Status must be one of: new, contacted, converted, rejected.' }
    ]);
  }
  return store.findAll({ status, search });
};

const getById = async (id) => {
  const lead = await store.findById(id);
  if (!lead) throw new ApiError(404, 'NOT_FOUND', 'Lead not found.');
  return lead;
};

const createLead = async (data) => {
  const exists = await store.existsByEmail(data.email);
  if (exists) throw new ApiError(409, 'DUPLICATE_EMAIL', 'This email is already on the waitlist.');
  return store.create(data);
};

const patchLead = async (id, partial) => {
  // If email is being changed, check uniqueness against other leads
  if (partial.email) {
    const exists = await store.existsByEmail(partial.email, id);
    if (exists) throw new ApiError(409, 'DUPLICATE_EMAIL', 'This email is already on the waitlist.');
  }
  const lead = await store.update(id, partial);
  if (!lead) throw new ApiError(404, 'NOT_FOUND', 'Lead not found.');
  return lead;
};

const replaceLead = async (id, data) => {
  if (data.email) {
    const exists = await store.existsByEmail(data.email, id);
    if (exists) throw new ApiError(409, 'DUPLICATE_EMAIL', 'This email is already on the waitlist.');
  }
  const lead = await store.replace(id, data);
  if (!lead) throw new ApiError(404, 'NOT_FOUND', 'Lead not found.');
  return lead;
};

const deleteLead = async (id) => {
  const deleted = await store.remove(id);
  if (!deleted) throw new ApiError(404, 'NOT_FOUND', 'Lead not found.');
};

module.exports = { getAll, getById, createLead, patchLead, replaceLead, deleteLead };
