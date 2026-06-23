/**
 * config.js — single source of truth for environment config.
 *
 * Changing the backend URL (e.g. from localhost to a deployed domain)
 * happens in ONE place. Every other file imports from here — none hardcode the URL.
 *
 * Week 4 architecture: frontend runs on Live Server (:5500), backend on Node (:3000).
 * Different ports = different origins = CORS required on the server.
 */

export const API_BASE_URL = 'http://localhost:3000';
