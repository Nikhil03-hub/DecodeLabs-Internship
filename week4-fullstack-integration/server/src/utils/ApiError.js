/**
 * ApiError — custom error class that carries HTTP status, code, message, and optional field details.
 * Controllers and services throw this; the centralized errorHandler catches it.
 *
 * Usage:
 *   throw new ApiError(422, 'VALIDATION_ERROR', 'Validation failed', [{ field:'email', message:'...' }]);
 *   throw new ApiError(404, 'NOT_FOUND', 'Lead not found');
 */
class ApiError extends Error {
  constructor(statusCode, code, message, details = []) {
    super(message);
    this.name       = 'ApiError';
    this.statusCode = statusCode;  // HTTP status
    this.code       = code;        // machine-readable string (e.g. 'VALIDATION_ERROR')
    this.details    = details;     // array of { field, message } for 422 responses
  }
}

module.exports = ApiError;
