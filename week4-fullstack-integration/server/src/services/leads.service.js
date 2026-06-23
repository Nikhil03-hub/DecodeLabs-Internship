/**
 * leads.service.js — business logic layer (Week 3/4, MongoDB version).
 *
 * Identical contract to Week 2's service — callers (controllers) don't change.
 * Only the store (Mongoose model) is different now.
 */

const Lead    = require('../models/Lead');
const ApiError = require('../utils/ApiError');

const STATUS_ENUM = ['new', 'contacted', 'converted', 'rejected'];

// Map Mongoose errors to our ApiError format
const handleMongooseError = (err) => {
  // Duplicate key (email unique index violated)
  if (err.code === 11000) {
    throw new ApiError(409, 'DUPLICATE_EMAIL', 'This email is already on the waitlist.');
  }
  // Validation errors from the schema
  if (err.name === 'ValidationError') {
    const details = Object.keys(err.errors).map(field => ({
      field,
      message: err.errors[field].message,
    }));
    throw new ApiError(422, 'VALIDATION_ERROR', 'Validation failed. Please check the highlighted fields.', details);
  }
  // CastError (e.g. malformed ObjectId) → treat as 404
  if (err.name === 'CastError') {
    throw new ApiError(404, 'NOT_FOUND', 'Lead not found.');
  }
  throw err; // unknown — let errorHandler deal with it
};

const getAll = async ({ status, search } = {}) => {
  if (status && !STATUS_ENUM.includes(status)) {
    throw new ApiError(422, 'VALIDATION_ERROR', 'Invalid status filter.', [
      { field: 'status', message: 'Status must be one of: new, contacted, converted, rejected.' }
    ]);
  }
  const query = {};
  if (status) query.status = status;
  if (search) {
    // Escape special regex chars to prevent ReDoS / 500 on inputs like "("
    const safe = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const re = new RegExp(safe, 'i');
    query.$or = [{ name: re }, { email: re }, { company: re }];
  }
  // Use full docs + toJSON() so the transform runs and _id/__v are stripped consistently
  const docs = await Lead.find(query).sort({ createdAt: -1 });
  return docs.map(d => d.toJSON());
};

const getById = async (id) => {
  let lead;
  try {
    lead = await Lead.findById(id);
  } catch (err) { handleMongooseError(err); }
  if (!lead) throw new ApiError(404, 'NOT_FOUND', 'Lead not found.');
  return lead.toJSON();
};

const createLead = async (data) => {
  try {
    const lead = await Lead.create({
      name:     data.name,
      email:    data.email,
      company:  data.company  || '',
      teamSize: data.teamSize || '',
      useCase:  data.useCase  || '',
      source:   data.source   || 'website',
    });
    return lead.toJSON();
  } catch (err) { handleMongooseError(err); }
};

const patchLead = async (id, partial) => {
  let lead;
  try {
    lead = await Lead.findByIdAndUpdate(
      id,
      { $set: partial },
      { new: true, runValidators: true }
    );
  } catch (err) { handleMongooseError(err); }
  if (!lead) throw new ApiError(404, 'NOT_FOUND', 'Lead not found.');
  return lead.toJSON();
};

const replaceLead = async (id, data) => {
  const update = {
    name:     data.name,
    email:    data.email,
    company:  data.company  || '',
    teamSize: data.teamSize || '',
    useCase:  data.useCase  || '',
    status:   data.status,
    source:   data.source   || 'website',
  };
  let lead;
  try {
    lead = await Lead.findByIdAndUpdate(id, update, { new: true, runValidators: true });
  } catch (err) { handleMongooseError(err); }
  if (!lead) throw new ApiError(404, 'NOT_FOUND', 'Lead not found.');
  return lead.toJSON();
};

const deleteLead = async (id) => {
  let result;
  try {
    result = await Lead.findByIdAndDelete(id);
  } catch (err) { handleMongooseError(err); }
  if (!result) throw new ApiError(404, 'NOT_FOUND', 'Lead not found.');
};

module.exports = { getAll, getById, createLead, patchLead, replaceLead, deleteLead };
