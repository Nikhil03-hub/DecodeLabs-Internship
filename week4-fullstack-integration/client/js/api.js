/**
 * api.js — the integration core. All fetch() calls go through here.
 *
 * Architecture: "The Native Skeleton" (from the DecodeLabs Week 4 deck).
 * fetch() has 4 parts: ENDPOINT, CONFIGURATION, HEADERS, PAYLOAD.
 * This module centralises all four so every call is consistent.
 *
 * KEY PRINCIPLE: fetch() does NOT reject on 4xx/5xx status codes.
 * It only rejects on true network failures (no connection, DNS failure, etc.).
 * Therefore we MUST check response.ok BEFORE calling response.json().
 * If we blindly call .json() on a 404 response that returns an HTML error page,
 * we crash with "SyntaxError: Unexpected token <" — the deck's anti-pattern #3.
 */

import { API_BASE_URL } from './config.js';

// Custom error class so callers can distinguish API errors from programming errors
class ApiError extends Error {
  constructor(code, message, details = []) {
    super(message);
    this.name    = 'ApiError';
    this.code    = code;      // machine-readable: 'NETWORK', 'NOT_FOUND', 'VALIDATION_ERROR', etc.
    this.details = details;   // array of { field, message } for 422 responses
  }
}

// ─── Private request helper ────────────────────────────────────────────────────
//
// All public functions are one-liners that call this.
// This helper embodies the "Complete Nervous System Lifecycle" from the deck:
//   Input  → builds URL + options (endpoint, config, headers, payload)
//   Await  → pauses without blocking the UI thread (the event loop stays active)
//   Check  → response.ok BEFORE .json() (avoids anti-pattern #3)
//   Output → unwraps the success envelope, or throws a typed ApiError

async function request(path, { method = 'GET', body } = {}) {
  // ENDPOINT — URL assembled from one central constant
  const url = `${API_BASE_URL}${path}`;

  // CONFIGURATION + HEADERS + PAYLOAD
  const options = {
    method,
    headers: { 'Content-Type': 'application/json' },
    // CORS preflight: the browser sends an invisible OPTIONS request first for
    // non-simple requests (POST/PATCH with Content-Type: application/json).
    // It checks Access-Control-Allow-Origin before sending the real request.
    // If the server isn't configured for CORS, the request dies here in the browser.
  };

  // PAYLOAD — serialization: JS object → JSON string (the "Border Crossing" slide)
  if (body !== undefined) {
    options.body = JSON.stringify(body);  // JSON.stringify: Object → wire text
  }

  // ── Network failure (fetch rejects) ────────────────────────────────────────
  // This try/catch catches ONLY true network errors (no connection, DNS failure).
  // It does NOT catch 4xx/5xx — those resolve normally and are handled below.
  let response;
  try {
    response = await fetch(url, options);
  } catch (networkErr) {
    // fetch threw → no server was reachable at all
    throw new ApiError('NETWORK', 'Could not reach the server. Check your connection and try again.');
  }

  // ── 204 No Content (DELETE success) ────────────────────────────────────────
  // There is no body to parse on a 204 — calling .json() would throw.
  if (response.status === 204) return null;

  // ── CHECK response.ok BEFORE response.json() ───────────────────────────────
  // CRITICAL: response.ok is false for 4xx and 5xx. If we skip this check and
  // call .json() on a 404 that returns an HTML error page, we crash.
  // response.json() = deserialization: wire text → JS object (the "Border Crossing" slide)
  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    // The server sent a structured error envelope; use it
    const err = payload?.error ?? {};
    throw new ApiError(
      err.code    || `HTTP_${response.status}`,
      err.message || 'An unexpected error occurred.',
      err.details || []
    );
  }

  // ── Success — unwrap the envelope ──────────────────────────────────────────
  // Callers receive clean data, not { success: true, data: ... } wrappers
  return payload?.data ?? payload;
}

// ─── Public API surface ────────────────────────────────────────────────────────

export const getHealth  = ()            => request('/api/health');
export const getLeads   = (params = {}) => request(`/api/leads${buildQuery(params)}`);
export const getLead    = (id)          => request(`/api/leads/${id}`);
export const createLead = (data)        => request('/api/leads',    { method: 'POST',   body: data });
export const updateLead = (id, partial) => request(`/api/leads/${id}`, { method: 'PATCH', body: partial });
export const replaceLead= (id, data)    => request(`/api/leads/${id}`, { method: 'PUT',   body: data });
export const deleteLead = (id)          => request(`/api/leads/${id}`, { method: 'DELETE' });

// Helper — build ?status=new&search=acme query string
function buildQuery(params) {
  const q = new URLSearchParams();
  if (params.status) q.set('status', params.status);
  if (params.search) q.set('search', params.search);
  const str = q.toString();
  return str ? `?${str}` : '';
}

// Re-export the error class so callers can `instanceof ApiError`
export { ApiError };
