/**
 * leadStore.js — THE SWAPPABLE SEAM.
 *
 * Week 2: all data lives in a module-level JS array. The server resets to seed
 * data on every restart — that is intentional (no database yet).
 *
 * Week 3 swaps this entire file for one backed by Mongoose. Because every
 * function here is async-shaped (returns Promises), the callers (service layer)
 * change zero lines when the swap happens.
 *
 * Public API:
 *   findAll({ status, search })       → Lead[]
 *   findById(id)                      → Lead | null
 *   create(data)                      → Lead
 *   update(id, partial)               → Lead | null
 *   replace(id, data)                 → Lead | null
 *   remove(id)                        → boolean
 *   existsByEmail(email, exceptId?)   → boolean
 */

const { randomUUID } = require('crypto');

// --- Seed data (so reviewers see real data immediately) ---
let leads = [
  {
    id:        randomUUID(),
    name:      'Aria Patel',
    email:     'aria.patel@deeptechco.io',
    company:   'DeepTech Co.',
    teamSize:  '11-50',
    useCase:   'Automate our release-notes workflow and reduce time-to-deploy.',
    status:    'contacted',
    source:    'website',
    createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id:        randomUUID(),
    name:      'Marcus Rivera',
    email:     'mrivera@axiomlabs.com',
    company:   'Axiom Labs',
    teamSize:  '51-200',
    useCase:   'Build an internal knowledge base that surfaces context automatically.',
    status:    'new',
    source:    'website',
    createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id:        randomUUID(),
    name:      'Sophie Chen',
    email:     'sophie.chen@luminaryhq.com',
    company:   'Luminary HQ',
    teamSize:  '2-10',
    useCase:   'Personal AI assistant for my design agency.',
    status:    'converted',
    source:    'referral',
    createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
  },
];

// Helpers
const now = () => new Date().toISOString();

const findAll = async ({ status, search } = {}) => {
  let result = [...leads];
  if (status) {
    result = result.filter(l => l.status === status);
  }
  if (search) {
    const re = new RegExp(search, 'i');
    result = result.filter(l =>
      re.test(l.name) || re.test(l.email) || re.test(l.company)
    );
  }
  return result.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
};

const findById = async (id) => {
  return leads.find(l => l.id === id) || null;
};

const create = async (data) => {
  const lead = {
    id:        randomUUID(),
    name:      data.name.trim(),
    email:     data.email.trim().toLowerCase(),
    company:   (data.company   || '').trim(),
    teamSize:  data.teamSize   || '',
    useCase:   (data.useCase   || '').trim(),
    status:    'new',
    source:    (data.source    || 'website').trim(),
    createdAt: now(),
    updatedAt: now(),
  };
  leads.push(lead);
  return { ...lead };
};

const update = async (id, partial) => {
  const idx = leads.findIndex(l => l.id === id);
  if (idx === -1) return null;
  const allowed = ['name', 'email', 'company', 'teamSize', 'useCase', 'status', 'source'];
  allowed.forEach(key => {
    if (partial[key] !== undefined) {
      leads[idx][key] = typeof partial[key] === 'string'
        ? (key === 'email' ? partial[key].trim().toLowerCase() : partial[key].trim())
        : partial[key];
    }
  });
  leads[idx].updatedAt = now();
  return { ...leads[idx] };
};

const replace = async (id, data) => {
  const idx = leads.findIndex(l => l.id === id);
  if (idx === -1) return null;
  leads[idx] = {
    id:        leads[idx].id,
    name:      data.name.trim(),
    email:     data.email.trim().toLowerCase(),
    company:   (data.company   || '').trim(),
    teamSize:  data.teamSize   || '',
    useCase:   (data.useCase   || '').trim(),
    status:    data.status     || leads[idx].status,
    source:    (data.source    || leads[idx].source).trim(),
    createdAt: leads[idx].createdAt,
    updatedAt: now(),
  };
  return { ...leads[idx] };
};

const remove = async (id) => {
  const idx = leads.findIndex(l => l.id === id);
  if (idx === -1) return false;
  leads.splice(idx, 1);
  return true;
};

const existsByEmail = async (email, exceptId = null) => {
  const normalized = email.trim().toLowerCase();
  return leads.some(l => l.email === normalized && l.id !== exceptId);
};

module.exports = { findAll, findById, create, update, replace, remove, existsByEmail };
