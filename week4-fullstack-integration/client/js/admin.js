/**
 * admin.js — the leads admin dashboard.
 *
 * Implements the full 8-step "Complete Nervous System Lifecycle" from the deck
 * on every data load:
 *   1. Event (load/refresh button click) → triggers async function
 *   2. try { } block opens (shield)
 *   3. fetch() initiated → CORS preflight runs
 *   4. await pauses function; UI stays responsive
 *   5. Check response.ok (inside api.js)
 *   6. response.json() deserialises JSON → JS object
 *   7. DOM injection via createElement + textContent (XSS-safe, never innerHTML for data)
 *   8. finally { } hides the loading skeleton
 *
 * Four UI states handled explicitly: loading, empty, error, success.
 * Anti-patterns avoided: no un-awaited fetches, no await in a loop for parallel ops,
 * no assuming 404 throws, no console.log as the only error handling.
 */

import { getLeads, updateLead, deleteLead, getHealth, ApiError } from './api.js';

// ─── DOM refs ─────────────────────────────────────────────────────────────────
const leadsTable   = document.getElementById('leads-table');   // parent table — was permanently hidden (bug fix)
const tbody        = document.getElementById('leads-tbody');
const skeletonRows = document.getElementById('skeleton-rows');
const emptyState   = document.getElementById('empty-state');
const errorState   = document.getElementById('error-state');
const errorMsg     = document.getElementById('error-msg');
const retryBtn     = document.getElementById('retry-btn');
const refreshBtn   = document.getElementById('refresh-btn');
const filterSelect = document.getElementById('status-filter');
const searchInput  = document.getElementById('search-input');
const countBadge   = document.getElementById('leads-count');

// Stats elements
const statTotal     = document.getElementById('stat-total');
const statNew       = document.getElementById('stat-new');
const statContacted = document.getElementById('stat-contacted');
const statConverted = document.getElementById('stat-converted');

// Server status indicator
const serverIndicator = document.getElementById('server-status');

// Toast
const toastContainer = document.getElementById('toast-container');

// ─── State ────────────────────────────────────────────────────────────────────
let allLeads     = [];
let isLoading    = false;
let searchTimer  = null;

// ─── Initialise ───────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  await checkServer();
  await loadLeads();
  setupControls();
});

// ─── Server health check ──────────────────────────────────────────────────────
async function checkServer() {
  try {
    await getHealth();
    if (serverIndicator) {
      serverIndicator.textContent = 'Server connected';
      serverIndicator.className   = 'server-status server-status--ok';
    }
  } catch {
    if (serverIndicator) {
      serverIndicator.textContent = 'Server offline';
      serverIndicator.className   = 'server-status server-status--error';
    }
  }
}

// ─── Load leads ───────────────────────────────────────────────────────────────
async function loadLeads() {
  if (isLoading) return;
  isLoading = true;

  const status = filterSelect?.value || '';
  const search = searchInput?.value.trim() || '';
  const params = {};
  if (status) params.status = status;
  if (search) params.search = search;

  // Show skeleton loading state
  showState('loading');

  try {
    // Step 4: await — pauses this async function without blocking the UI
    const data = await getLeads(params);
    allLeads = Array.isArray(data) ? data : (data?.data ?? []);

    if (allLeads.length === 0) {
      showState('empty');
    } else {
      showState('success');
      renderLeads(allLeads);
    }
    updateStats(allLeads);

  } catch (err) {
    const message = err instanceof ApiError && err.code === 'NETWORK'
      ? 'Could not connect to the server. Is the backend running?'
      : err.message || 'Failed to load leads.';
    showError(message);
    showState('error');

  } finally {
    // Step 8: always hide the loading indicator — success or failure
    isLoading = false;
    if (refreshBtn) {
      refreshBtn.disabled = false;
      refreshBtn.querySelector('.btn-text').textContent = 'Refresh';
    }
  }
}

// ─── Render leads list ────────────────────────────────────────────────────────
function renderLeads(leads) {
  if (!tbody) return;
  tbody.innerHTML = '';  // safe here — we're clearing our own container, not injecting user data

  // Use .map() to create DOM nodes for each lead in the data array
  leads.forEach(lead => {
    const row = buildRow(lead);
    tbody.appendChild(row);
  });

  if (countBadge) countBadge.textContent = leads.length;
}

// Build a single table row — ALL lead data is injected with textContent (never innerHTML)
// This is the deck's "Unidirectional Data Flow + DOM Insertion Process"
function buildRow(lead) {
  const tr = document.createElement('tr');
  tr.className     = 'leads-row';
  tr.dataset.id    = lead.id;

  // ── Name + email cell ──
  const nameTd = document.createElement('td');
  nameTd.className = 'td td--name';
  const nameSpan = document.createElement('span');
  nameSpan.className   = 'lead-name';
  nameSpan.textContent = lead.name;    // XSS-safe: textContent, never innerHTML
  const emailSpan = document.createElement('span');
  emailSpan.className   = 'lead-email';
  emailSpan.textContent = lead.email;  // XSS-safe
  nameTd.appendChild(nameSpan);
  nameTd.appendChild(emailSpan);

  // ── Company + team size cell ──
  const companyTd = document.createElement('td');
  companyTd.className = 'td td--company';
  const companySpan = document.createElement('span');
  companySpan.className   = 'company-name';
  companySpan.textContent = lead.company || '—';
  const sizeSpan = document.createElement('span');
  sizeSpan.className   = 'team-size';
  sizeSpan.textContent = lead.teamSize ? `${lead.teamSize} people` : '';
  companyTd.appendChild(companySpan);
  companyTd.appendChild(sizeSpan);

  // ── Status badge cell ──
  const statusTd = document.createElement('td');
  statusTd.className = 'td td--status';
  const badge = document.createElement('span');
  badge.className   = `status-badge status-badge--${lead.status}`;
  badge.textContent = lead.status;     // XSS-safe
  statusTd.appendChild(badge);

  // ── Date cell ──
  const dateTd = document.createElement('td');
  dateTd.className   = 'td td--date';
  dateTd.textContent = formatDate(lead.createdAt);

  // ── Actions cell ──
  const actionsTd = document.createElement('td');
  actionsTd.className = 'td td--actions';

  // "Mark Contacted" button — only show if not already contacted/converted/rejected
  if (lead.status === 'new') {
    const contactBtn = document.createElement('button');
    contactBtn.className   = 'action-btn action-btn--contact';
    contactBtn.textContent = 'Contact';
    contactBtn.setAttribute('aria-label', `Mark ${lead.name} as contacted`);
    contactBtn.addEventListener('click', () => handleContact(lead.id, tr, contactBtn));
    actionsTd.appendChild(contactBtn);
  }

  // Delete button
  const deleteBtn = document.createElement('button');
  deleteBtn.className   = 'action-btn action-btn--delete';
  deleteBtn.textContent = '✕';
  deleteBtn.setAttribute('aria-label', `Delete lead: ${lead.name}`);
  deleteBtn.addEventListener('click', () => handleDelete(lead.id, tr, deleteBtn));
  actionsTd.appendChild(deleteBtn);

  tr.appendChild(nameTd);
  tr.appendChild(companyTd);
  tr.appendChild(statusTd);
  tr.appendChild(dateTd);
  tr.appendChild(actionsTd);

  return tr;
}

// ─── Action: mark as contacted ────────────────────────────────────────────────
async function handleContact(id, row, btn) {
  btn.disabled     = true;
  btn.textContent  = '…';

  try {
    // PATCH — partial update, only the status field changes
    // If we need multiple fields, use Promise.all([]) — not await in a loop (anti-pattern #2)
    const updated = await updateLead(id, { status: 'contacted' });

    // Optimistic UI: update the badge in the existing row instead of re-fetching everything
    const badge = row.querySelector('.status-badge');
    if (badge) {
      badge.className   = 'status-badge status-badge--contacted';
      badge.textContent = 'contacted';
    }
    btn.remove();  // remove "Contact" button once done
    showToast(`Lead marked as contacted.`, 'success');

    // Update global state
    const idx = allLeads.findIndex(l => (l.id ?? l._id) === id);
    if (idx !== -1) allLeads[idx].status = 'contacted';
    updateStats(allLeads);

  } catch (err) {
    btn.disabled    = false;
    btn.textContent = 'Contact';
    showToast(err.message || 'Failed to update lead.', 'error');
  }
}

// ─── Action: delete lead ──────────────────────────────────────────────────────
async function handleDelete(id, row, btn) {
  if (!confirm('Delete this lead? This cannot be undone.')) return;

  btn.disabled    = true;
  btn.textContent = '…';

  try {
    await deleteLead(id);  // DELETE → 204 No Content (api.js returns null)

    // Animate row out, then remove it from DOM
    row.classList.add('row--deleting');
    row.addEventListener('transitionend', () => {
      row.remove();
      allLeads = allLeads.filter(l => (l.id ?? l._id) !== id);
      if (countBadge) countBadge.textContent = allLeads.length;
      updateStats(allLeads);
      if (allLeads.length === 0) showState('empty');
    }, { once: true });

    showToast('Lead deleted.', 'success');

  } catch (err) {
    btn.disabled    = false;
    btn.textContent = '✕';
    showToast(err.message || 'Failed to delete lead.', 'error');
  }
}

// ─── Update stats cards ───────────────────────────────────────────────────────
function updateStats(leads) {
  const counts = { total: leads.length, new: 0, contacted: 0, converted: 0, rejected: 0 };
  leads.forEach(l => { if (counts[l.status] !== undefined) counts[l.status]++; });

  animateCount(statTotal,     counts.total);
  animateCount(statNew,       counts.new);
  animateCount(statContacted, counts.contacted);
  animateCount(statConverted, counts.converted);
}

function animateCount(el, target) {
  if (!el) return;
  const start    = parseInt(el.textContent) || 0;
  const duration = 400;
  const startTime = performance.now();

  const step = (now) => {
    const pct = Math.min((now - startTime) / duration, 1);
    el.textContent = Math.round(start + (target - start) * easeOut(pct));
    if (pct < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}
const easeOut = t => 1 - Math.pow(1 - t, 3);

// ─── UI state machine ─────────────────────────────────────────────────────────
// Controls which of the 4 states is visible. Only one shows at a time.
// FIX: was controlling #leads-tbody (child) but #leads-table (parent) had [hidden] — never shown.
function showState(state) {
  if (skeletonRows) skeletonRows.hidden = state !== 'loading';
  if (leadsTable)   leadsTable.hidden   = state !== 'success';  // ← control the TABLE, not tbody
  if (emptyState)   emptyState.hidden   = state !== 'empty';
  if (errorState)   errorState.hidden   = state !== 'error';
}

function showError(message) {
  if (errorMsg) errorMsg.textContent = message;
}

// ─── Controls setup ───────────────────────────────────────────────────────────
function setupControls() {
  refreshBtn?.addEventListener('click', () => {
    if (isLoading) return;
    const t = refreshBtn.querySelector('.btn-text');
    if (t) t.textContent = 'Loading…';
    refreshBtn.disabled = true;
    loadLeads();
  });

  retryBtn?.addEventListener('click', () => loadLeads());

  filterSelect?.addEventListener('change', () => loadLeads());

  // Debounced search — don't fire on every keystroke
  searchInput?.addEventListener('input', () => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => loadLeads(), 350);
  });
}

// ─── Toast system ─────────────────────────────────────────────────────────────
function showToast(message, type = 'info') {
  if (!toastContainer) return;

  const toast = document.createElement('div');
  toast.className = `toast toast--${type}`;
  toast.setAttribute('role', 'alert');

  const icons = { success: '✓', error: '✕', info: 'ℹ' };
  const icon  = document.createElement('span');
  icon.className   = 'toast__icon';
  icon.textContent = icons[type] || 'ℹ';
  icon.setAttribute('aria-hidden', 'true');

  const msg  = document.createElement('span');
  msg.className   = 'toast__msg';
  msg.textContent = message;   // textContent — XSS-safe

  toast.appendChild(icon);
  toast.appendChild(msg);
  toastContainer.appendChild(toast);

  requestAnimationFrame(() => toast.classList.add('toast--visible'));

  setTimeout(() => {
    toast.classList.remove('toast--visible');
    toast.addEventListener('transitionend', () => toast.remove(), { once: true });
  }, 4000);
}

// ─── Utilities ────────────────────────────────────────────────────────────────
function formatDate(isoString) {
  if (!isoString) return '—';
  const d = new Date(isoString);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

// ─── Theme toggle (mirrors landing page — shares nexus-theme localStorage key) ─
(function initTheme() {
  const htmlEl      = document.documentElement;
  const themeToggle = document.getElementById('theme-toggle');

  function applyTheme(theme) {
    htmlEl.setAttribute('data-theme', theme);
    localStorage.setItem('nexus-theme', theme);
    if (themeToggle) {
      themeToggle.setAttribute(
        'aria-label',
        theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'
      );
    }
  }

  // Restore saved preference (same key as landing page — stays in sync)
  applyTheme(localStorage.getItem('nexus-theme') || 'dark');

  themeToggle?.addEventListener('click', function () {
    applyTheme(htmlEl.getAttribute('data-theme') === 'dark' ? 'light' : 'dark');
  });

  // Follow OS preference if user hasn't picked one yet
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', function (e) {
    if (!localStorage.getItem('nexus-theme')) applyTheme(e.matches ? 'dark' : 'light');
  });
})();

// ─── Custom cursor (mirrors landing page — same LERP + top/left approach) ────
(function initCursor() {
  if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;

  const cursor = document.getElementById('cursor');
  if (!cursor) return;

  const dot  = cursor.querySelector('.cursor__dot');
  const ring = cursor.querySelector('.cursor__ring');

  let mouseX = -100, mouseY = -100, ringX = -100, ringY = -100;
  const LERP = 0.42;  // matches your landing-page setting

  // Dot tracks instantly
  window.addEventListener('mousemove', function(e) {
    mouseX = e.clientX;
    mouseY = e.clientY;
    if (dot) dot.style.transform = 'translate(' + (mouseX - 4) + 'px, ' + (mouseY - 4) + 'px)';
  }, { passive: true });

  // Ring follows with lag via top/left (matches your landing-page approach)
  (function animateRing() {
    ringX += (mouseX - ringX) * LERP;
    ringY += (mouseY - ringY) * LERP;
    if (ring) { ring.style.left = ringX + 'px'; ring.style.top = ringY + 'px'; }
    requestAnimationFrame(animateRing);
  })();

  // Click states
  window.addEventListener('mousedown', function() { cursor.classList.add('cursor--clicking'); });
  window.addEventListener('mouseup',   function() { cursor.classList.remove('cursor--clicking'); });

  // Hover expand on all interactive elements (including table rows, badges, action buttons)
  document.querySelectorAll(
    'a, button, [role="button"], input, select, textarea, label, .leads-row, .stat-card'
  ).forEach(function(el) {
    el.addEventListener('mouseenter', function() { cursor.classList.add('cursor--hovering'); });
    el.addEventListener('mouseleave', function() { cursor.classList.remove('cursor--hovering'); });
  });
})();
