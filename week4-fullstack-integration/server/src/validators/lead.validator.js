/**
 * lead.validator.js — pure validation; returns an array of { field, message }.
 * Empty array = valid. No side effects. Called by the controller.
 *
 * Key principle: NEVER trust client input. Validate everything server-side
 * regardless of what the frontend already checked.
 */

const TEAM_SIZE_ENUM  = ['1', '2-10', '11-50', '51-200', '200+'];
const STATUS_ENUM     = ['new', 'contacted', 'converted', 'rejected'];
const EMAIL_RE        = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/**
 * Validate a POST /api/leads body.
 * name + email are required; all others optional.
 */
const validateCreate = (body) => {
  const errors = [];
  const { name, email, company, teamSize, useCase, source } = body || {};

  // name
  const nameTrimmed = (name || '').trim();
  if (!nameTrimmed)                        errors.push({ field: 'name', message: 'Name is required.' });
  else if (nameTrimmed.length < 2)         errors.push({ field: 'name', message: 'Name must be at least 2 characters.' });
  else if (nameTrimmed.length > 80)        errors.push({ field: 'name', message: 'Name must be 80 characters or fewer.' });

  // email
  const emailTrimmed = (email || '').trim().toLowerCase();
  if (!emailTrimmed)                       errors.push({ field: 'email', message: 'Email is required.' });
  else if (!EMAIL_RE.test(emailTrimmed))   errors.push({ field: 'email', message: 'A valid email address is required.' });
  else if (emailTrimmed.length > 254)      errors.push({ field: 'email', message: 'Email must be 254 characters or fewer.' });

  // optional fields
  if (company   && String(company).trim().length > 100) errors.push({ field: 'company',  message: 'Company must be 100 characters or fewer.' });
  if (teamSize  && !TEAM_SIZE_ENUM.includes(teamSize))  errors.push({ field: 'teamSize', message: 'Team size must be one of: 1, 2-10, 11-50, 51-200, 200+.' });
  if (useCase   && String(useCase).trim().length > 500) errors.push({ field: 'useCase',  message: 'Use case must be 500 characters or fewer.' });
  if (source    && String(source).trim().length  > 50)  errors.push({ field: 'source',   message: 'Source must be 50 characters or fewer.' });

  return errors;
};

/**
 * Validate a PATCH /api/leads/:id body (partial — only present fields are validated).
 */
const validatePatch = (body) => {
  const errors = [];
  const { name, email, company, teamSize, useCase, source, status } = body || {};

  if (name !== undefined) {
    const t = String(name).trim();
    if (!t || t.length < 2)   errors.push({ field: 'name', message: 'Name must be at least 2 characters.' });
    if (t.length > 80)        errors.push({ field: 'name', message: 'Name must be 80 characters or fewer.' });
  }
  if (email !== undefined) {
    const t = String(email).trim().toLowerCase();
    if (!EMAIL_RE.test(t))    errors.push({ field: 'email', message: 'A valid email address is required.' });
    if (t.length > 254)       errors.push({ field: 'email', message: 'Email must be 254 characters or fewer.' });
  }
  if (company  !== undefined && String(company).trim().length  > 100) errors.push({ field: 'company',  message: 'Company must be 100 characters or fewer.' });
  if (teamSize !== undefined && !TEAM_SIZE_ENUM.includes(teamSize))   errors.push({ field: 'teamSize', message: 'Team size must be one of: 1, 2-10, 11-50, 51-200, 200+.' });
  if (useCase  !== undefined && String(useCase).trim().length  > 500) errors.push({ field: 'useCase',  message: 'Use case must be 500 characters or fewer.' });
  if (source   !== undefined && String(source).trim().length   >  50) errors.push({ field: 'source',   message: 'Source must be 50 characters or fewer.' });
  if (status   !== undefined && !STATUS_ENUM.includes(status))        errors.push({ field: 'status',   message: 'Status must be one of: new, contacted, converted, rejected.' });

  return errors;
};

/**
 * Validate a PUT /api/leads/:id body (full replace — name + email required again).
 */
const validateReplace = (body) => {
  const errors = validateCreate(body);
  const { status } = body || {};
  if (status !== undefined && !STATUS_ENUM.includes(status)) {
    errors.push({ field: 'status', message: 'Status must be one of: new, contacted, converted, rejected.' });
  }
  return errors;
};

module.exports = { validateCreate, validatePatch, validateReplace };
