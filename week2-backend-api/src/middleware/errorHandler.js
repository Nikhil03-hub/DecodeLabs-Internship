/**
 * errorHandler.js — centralized Express error middleware (4 arguments = Express knows it's an error handler).
 *
 * Error types handled:
 *  1. ApiError (thrown deliberately by controllers/services) → use its statusCode + code
 *  2. JSON parse error (malformed request body) → 400 BAD_REQUEST
 *  3. Anything else → 500 INTERNAL_ERROR; stack trace logged server-side, NEVER sent to client
 *
 * The rule: never leak stack traces or internal paths to the client.
 * Centralising here means every controller just does `next(err)` — no duplicated status logic.
 */

const ApiError = require('../utils/ApiError');

// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, next) => {
  // 1. Our own controlled error
  if (err instanceof ApiError) {
    const body = { success: false, error: { code: err.code, message: err.message } };
    if (err.details && err.details.length) body.error.details = err.details;
    return res.status(err.statusCode).json(body);
  }

  // 2. express.json() fails (malformed JSON body)
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({
      success: false,
      error: { code: 'BAD_REQUEST', message: 'Request body contains invalid JSON.' }
    });
  }

  // 3. Unknown — log server-side, generic 500 to client
  console.error('[ERROR]', new Date().toISOString(), err.stack || err.message);
  return res.status(500).json({
    success: false,
    error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred. Please try again later.' }
  });
};

module.exports = errorHandler;
