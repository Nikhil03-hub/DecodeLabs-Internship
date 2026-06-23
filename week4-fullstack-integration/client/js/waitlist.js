/**
 * waitlist.js — handles the "Join the Waitlist" form on index.html.
 *
 * Demonstrates the full "Complete Nervous System Lifecycle" from the deck:
 *   1. User clicks Submit → triggers async function
 *   2. try { } block opens (the shield)
 *   3. fetch() initiated via createLead() → browser runs CORS preflight
 *   4. await pauses the function without freezing the UI thread
 *   5. Check response.ok (done inside api.js)
 *   6. response.json() deserialises the payload (done inside api.js)
 *   7. DOM updated: show success state
 *   8. finally { } hides the spinner and re-enables the button
 */

import { createLead, ApiError } from './api.js';

// ─── DOM refs ─────────────────────────────────────────────────────────────────
const form       = document.getElementById('waitlist-form');
const submitBtn  = document.getElementById('waitlist-submit');
const submitText = submitBtn?.querySelector('.submit__text');
const spinner    = submitBtn?.querySelector('.submit__spinner');
const successEl  = document.getElementById('waitlist-success');
const resetBtn   = document.getElementById('waitlist-reset');

// Field → error element mapping
const fields = {
  name:     { input: document.getElementById('wl-name'),     err: document.getElementById('wl-name-error') },
  email:    { input: document.getElementById('wl-email'),    err: document.getElementById('wl-email-error') },
  company:  { input: document.getElementById('wl-company'),  err: null },
  teamSize: { input: document.getElementById('wl-teamsize'), err: null },
  useCase:  { input: document.getElementById('wl-usecase'),  err: null },
};

if (!form) throw new Error('waitlist-form not found on this page.');

// ─── Client-side validation (UX only — server is the real gate) ───────────────
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function clientValidate(data) {
  const errors = [];
  clearFieldErrors();

  if (!data.name || data.name.length < 2) {
    errors.push({ field: 'name', message: 'Please enter your full name (at least 2 characters).' });
  }
  if (!data.email || !EMAIL_RE.test(data.email)) {
    errors.push({ field: 'email', message: 'Please enter a valid email address.' });
  }
  return errors;
}

// ─── Loading state helpers ────────────────────────────────────────────────────
function setLoading(on) {
  if (!submitBtn) return;
  submitBtn.disabled = on;
  if (submitText) submitText.textContent = on ? 'Joining…' : 'Join the Waitlist';
  if (spinner) spinner.style.display = on ? 'inline-block' : 'none';
}

// ─── Error display helpers ────────────────────────────────────────────────────
function clearFieldErrors() {
  Object.values(fields).forEach(({ input, err }) => {
    if (input) input.classList.remove('form__input--error');
    if (err)   { err.textContent = ''; err.hidden = true; }
  });
}

function showFieldError(field, message) {
  const f = fields[field];
  if (!f) return;
  if (f.input) f.input.classList.add('form__input--error');
  if (f.err)   { f.err.textContent = message; f.err.hidden = false; }
}

function showToast(message, type = 'error') {
  // Dispatch a custom event so the global toast system handles display
  document.dispatchEvent(new CustomEvent('show-toast', { detail: { message, type } }));
}

// ─── Form submission ──────────────────────────────────────────────────────────
form.addEventListener('submit', async (event) => {
  // Step 1: prevent the default full-page reload (this is a dynamic fetch-based form)
  event.preventDefault();

  const data = {
    name:     fields.name.input?.value.trim()     || '',
    email:    fields.email.input?.value.trim()    || '',
    company:  fields.company.input?.value.trim()  || '',
    teamSize: fields.teamSize.input?.value        || '',
    useCase:  fields.useCase.input?.value.trim()  || '',
    source:   'website',
  };

  // Step 2: lightweight client-side validation (fast UX feedback)
  const clientErrors = clientValidate(data);
  if (clientErrors.length) {
    clientErrors.forEach(({ field, message }) => showFieldError(field, message));
    // Shake animation on first errored field
    const firstErr = fields[clientErrors[0].field]?.input;
    firstErr?.classList.add('shake');
    firstErr?.addEventListener('animationend', () => firstErr.classList.remove('shake'), { once: true });
    return;
  }

  // Step 3: loading state — disable button, show spinner
  setLoading(true);
  clearFieldErrors();

  // Steps 4-7: async/await request with defensive try/catch/finally
  try {
    // AWAIT: pauses this function's execution; UI thread stays responsive (event loop active)
    await createLead(data);

    // Step 7 (success): hide form, show success confirmation
    form.hidden = true;
    if (successEl) successEl.hidden = false;

    // Smooth scroll to the confirmation
    successEl?.scrollIntoView({ behavior: 'smooth', block: 'center' });

  } catch (err) {
    // Distinguish error types — each gets a specific, helpful message (no blank screens)
    if (err instanceof ApiError) {

      if (err.code === 'VALIDATION_ERROR' && err.details?.length) {
        // 422 — map server field errors back onto the form inputs
        err.details.forEach(({ field, message }) => showFieldError(field, message));
        showToast('Please fix the highlighted fields.', 'error');

      } else if (err.code === 'DUPLICATE_EMAIL') {
        // 409 — email already registered
        showFieldError('email', 'This email is already on the waitlist.');
        showToast('This email is already on the waitlist.', 'info');

      } else if (err.code === 'NETWORK') {
        // True network failure — fetch threw (server unreachable)
        showToast("Couldn't reach the server. Check your connection and try again.", 'error');

      } else {
        // Any other HTTP error (500, etc.)
        showToast('Something went wrong on our end. Please try again.', 'error');
      }

    } else {
      // Unexpected programming error — log it and show a generic message
      console.error('[waitlist] unexpected error:', err);
      showToast('An unexpected error occurred. Please try again.', 'error');
    }

  } finally {
    // Step 8: ALWAYS restore the button — success or failure (the deck's .finally() rule)
    setLoading(false);
  }
});

// ─── "Add another email" reset ────────────────────────────────────────────────
resetBtn?.addEventListener('click', (e) => {
  e.preventDefault();
  form.reset();
  form.hidden = false;
  if (successEl) successEl.hidden = true;
  clearFieldErrors();
  fields.name.input?.focus();
});

// ─── Toast system (shared with admin.js if on same page) ─────────────────────
// Only initialise if the toast container exists on this page
const toastContainer = document.getElementById('toast-container');
if (toastContainer) {
  document.addEventListener('show-toast', ({ detail: { message, type = 'info' } }) => {
    const toast = document.createElement('div');
    toast.className = `toast toast--${type}`;
    toast.setAttribute('role', 'alert');
    toast.setAttribute('aria-live', 'assertive');

    const icon = { success: '✓', error: '✕', info: 'ℹ' }[type] || 'ℹ';
    toast.innerHTML =
      `<span class="toast__icon" aria-hidden="true">${icon}</span>` +
      `<span class="toast__msg">${escapeHtml(message)}</span>`;

    toastContainer.appendChild(toast);
    // Slide in
    requestAnimationFrame(() => toast.classList.add('toast--visible'));
    // Auto-dismiss after 4s
    setTimeout(() => {
      toast.classList.remove('toast--visible');
      toast.addEventListener('transitionend', () => toast.remove(), { once: true });
    }, 4000);
  });
}

// XSS-safe string escaping for toast messages
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
