/**
 * respond.js — uniform response helpers.
 * Every route response goes through one of these so the envelope is always identical.
 *
 * Success envelope:  { success: true,  data: <payload>, count?: <n> }
 * Error envelope:    { success: false, error: { code, message, details? } }
 */

const sendSuccess = (res, statusCode, data, extra = {}) => {
  const body = { success: true, data, ...extra };
  return res.status(statusCode).json(body);
};

const sendError = (res, statusCode, code, message, details = []) => {
  const error = { code, message };
  if (details.length) error.details = details;
  return res.status(statusCode).json({ success: false, error });
};

module.exports = { sendSuccess, sendError };
