# DecodeLabs Internship — Nexus AI

A progressive, full-stack web project built across four weeks during the DecodeLabs internship. The product is **Nexus AI** — a fictional SaaS landing page that evolves from a pure HTML/CSS/JS frontend into a fully connected full-stack application with a MongoDB-backed REST API and an admin dashboard.

**Hard constraint throughout all weeks:** Zero external frameworks. No React, Vue, Angular, jQuery, Bootstrap, or Tailwind. Pure HTML5, CSS3, Vanilla JavaScript, and Node.js only.

---

## Repository Structure

```
DecodeLabs-Internship/
├── week1-responsive-frontend/   ← Static frontend only
├── week2-backend-api/           ← REST API with in-memory store
├── week3-database-integration/  ← Same API wired to MongoDB
└── week4-fullstack-integration/ ← Week 3 backend + Week 1 frontend connected
```

Each week builds directly on the previous, but is kept as its own standalone folder so the progression is clearly visible.

---

## Features

**Landing Page (Nexus AI)**
- Fully responsive, pixel-perfect layout across mobile, tablet, and desktop
- Custom cursor with LERP-based ring lag (no library used)
- Animated hero section with WebGL-style canvas, gradient orbs, and badge glow
- Features, How It Works, Pricing, FAQ (accessible accordion), and CTA sections
- Waitlist form with real-time client validation and inline error feedback
- Dark/Light theme toggle — persisted to `localStorage`, respects OS preference
- Scroll progress bar and scroll-aware sticky nav
- Shimmer light sweep on nav header (CSS animation, no JS)
- Floating dashboard mockup showing live AI workflow metrics

**Backend API**
- Full CRUD REST API for leads (waitlist signups)
- Consistent `{ success, data, count }` / `{ success, error }` response envelope
- Structured error handling with machine-readable error codes and per-field `details[]`
- Request ID tracing on every request
- ReDoS-safe regex search, XSS-safe DOM injection (never `innerHTML` for user data)

**Admin Dashboard**
- Four explicit UI states: loading skeleton, success table, empty, error-with-retry
- Animated count-up stat cards (Total, New, Contacted, Converted leads)
- Debounced live search + status filter — calls API on keystroke pause
- Optimistic UI for status updates — badge updates instantly without reload
- Toast notification system (success/error) auto-dismisses after 4 seconds
- Shared theme + cursor system with landing page

---

## Tech Stack

| Layer | Technology | Notes |
|-------|-----------|-------|
| Frontend markup | HTML5 | Semantic, accessible elements throughout |
| Styling | CSS3 | Custom properties, Grid, Flexbox, animations — zero utility frameworks |
| Frontend logic | Vanilla JavaScript (ES6+) | ES modules, async/await, Intersection Observer, LERP animation |
| Backend runtime | Node.js ≥ 18 | CommonJS modules |
| Web framework | Express.js | Minimal wrapper — no ORM magic |
| Database | MongoDB | Atlas (cloud) or local instance |
| ODM | Mongoose | Schema, validation, `toJSON` transform |
| Environment config | dotenv | `.env` gitignored, `.env.example` committed |
| CORS | cors (npm) | Configured per-origin in `src/app.js` |
| Dev server | VS Code Live Server | Hot-reload for static client |

**What was deliberately excluded:** React, Vue, Angular, jQuery, Bootstrap, Tailwind, Axios, Lodash — the constraint was to build everything from first principles.

---

## Week 1 — Responsive Frontend

**Goal:** Build a production-quality, fully responsive landing page using only HTML, CSS, and JavaScript — no libraries, no frameworks.

### What Was Built

The **Nexus AI** landing page with the following sections:

- **Hero** — full-viewport hero with an animated WebGL-style canvas background, ambient gradient orbs, and a pulsing badge CTA
- **Features** — six feature cards with animated icons and staggered entrance animations
- **How It Works** — three-step horizontal process with a connecting line
- **Pricing** — three-tier pricing table with a "Most Popular" highlight
- **FAQ** — accessible `<details>`/`<summary>` accordion with smooth expand animation
- **Waitlist Form** — client-validated, multi-field form with inline error messages and a success state
- **CTA Banner** — bottom conversion section with ambient glow orbs
- **Footer** — responsive four-column layout

### UI/UX Highlights

- **Custom cursor** — dot tracks mouse instantly, larger ring follows with LERP-based lag (smoothness factor 0.42). White dot + glass ring using `backdrop-filter: blur(4px)` for dark mode; inverted dark dot for light mode.
- **Dark/Light theme toggle** — persisted to `localStorage` under key `nexus-theme`. OS preference respected as fallback via `matchMedia('prefers-color-scheme')`.
- **Scroll progress bar** — 2.5px bar at the very top (z-index 2000) showing read progress using a mocha-blue gradient.
- **Intersection Observer animations** — elements fade/slide in as they enter the viewport; no layout shift.
- **Scroll-aware sticky nav** — adds `.header--scrolled` class after 20px scroll, triggering a subtle shadow and background shift.

### Brand Design System

| Token | Value | Use |
|-------|-------|-----|
| Mocha Mousse | `#A5856F` | Primary brand, CTA buttons, nav header |
| Mocha Light | `#C4956A` | Hover states, gradients |
| Ethereal Blue | `#A0D4E0` | Accents, cursor ring, highlights |
| Moonlit Grey | `#F2F0EA` | Light backgrounds, body text |
| Deep Background | `#0E0906` | Dark mode page background |

### How to Run

```bash
# Open directly in any browser — no build step required
open week1-responsive-frontend/index.html
```

> Uses VS Code Live Server for hot-reload during development.

### File Structure

```
week1-responsive-frontend/
├── index.html       ← Full page markup with semantic HTML5
├── css/
│   └── style.css    ← ~2800 lines; 30+ sections; CSS custom properties
└── js/
    └── script.js    ← Cursor, animations, nav, theme, scroll progress
```

---

## Week 2 — REST API (In-Memory Store)

**Goal:** Build a proper REST API with Express.js that follows real-world conventions — layered architecture, structured error responses, full HTTP verb support — using an in-memory array as the data store so no database setup is needed.

### What Was Built

A Node.js/Express server implementing full CRUD for "leads" (waitlist signups):

| Method | Route | Description |
|--------|-------|-------------|
| `GET` | `/api/leads` | List all leads; optional `?status=` and `?search=` filters |
| `POST` | `/api/leads` | Create a new lead |
| `GET` | `/api/leads/:id` | Get a single lead by ID |
| `PATCH` | `/api/leads/:id` | Partial update (e.g., change status only) |
| `PUT` | `/api/leads/:id` | Full replacement |
| `DELETE` | `/api/leads/:id` | Remove a lead |
| `GET` | `/health` | Server health check |

### API Response Envelope

Every response uses a consistent envelope:

```json
// Success
{ "success": true, "data": { ... }, "count": 1 }

// Error
{ "success": false, "error": { "code": "NOT_FOUND", "message": "Lead not found." } }
```

### Architecture — Layered MVC

```
server.js                ← Entry point (binds port, starts Express)
src/
├── app.js               ← Express app factory (middleware, routes, error handler)
├── routes/              ← Route definitions only — no logic
│   └── leads.routes.js
├── controllers/         ← HTTP layer: parse request, call service, send response
│   └── leads.controller.js
├── services/            ← Business logic (validation, data operations)
│   └── leads.service.js
├── store/
│   └── leadStore.js     ← In-memory array + UUID-based ID generation
├── validators/
│   └── lead.validator.js ← Schema validation (name required, email format, enum check)
├── middleware/
│   ├── errorHandler.js  ← Central error handler (catches ApiError + unknown errors)
│   └── notFound.js      ← 404 catch-all for unmatched routes
└── utils/
    ├── ApiError.js      ← Custom error class with HTTP status + code + details
    └── respond.js       ← Helper: res.success() and res.error()
```

### Key Technical Decisions

- **Separation of concerns**: Controllers handle HTTP, services handle business logic, store handles data — each layer has one job.
- **Custom `ApiError` class**: Every thrown error carries a status code, machine-readable code, and optional field-level `details` array for validation failures.
- **`req.id` tracing**: Every request gets a UUID for tracing errors end-to-end in logs.

### How to Run

```bash
cd week2-backend-api
npm install
node server.js
# API live at http://localhost:3000
```

---

## Week 3 — Database Integration (MongoDB + Mongoose)

**Goal:** Swap the in-memory store for a real MongoDB database, with zero changes to the controller or route layer — the service interface stays identical.

### What Changed from Week 2

- `store/leadStore.js` removed; replaced by `models/Lead.js` (Mongoose schema)
- `services/leads.service.js` rewritten to use Mongoose instead of array operations
- `config/db.js` added — connects to MongoDB on startup
- `.env` file introduced (`MONGODB_URI`, `PORT`) with `.env.example` committed to the repo

### Mongoose Schema — Lead

```js
{
  name:      String  (required, min 2 chars)
  email:     String  (required, unique, lowercase, trimmed)
  company:   String
  teamSize:  String  (enum: ['1-10', '11-50', '51-200', '201-1000', '1000+', ''])
  useCase:   String  (max 500 chars)
  status:    String  (enum: ['new', 'contacted', 'converted', 'rejected'], default: 'new')
  source:    String  (default: 'website')
  createdAt: Date    (auto via timestamps)
  updatedAt: Date    (auto via timestamps)
}
```

### Key Technical Decisions

**`toJSON` transform** — prevents internal Mongoose fields from leaking to clients:
```js
toJSON: {
  virtuals: true,
  versionKey: false,          // removes __v
  transform(doc, ret) {
    ret.id = ret._id.toString();  // expose clean string `id`
    delete ret._id;               // remove raw ObjectId
  }
}
```

**Avoiding `.lean()`** — all read operations use full Mongoose documents and call `.toJSON()` explicitly, because `.lean()` bypasses the transform and would expose `_id`/`__v` again.

**ReDoS protection** — the search query escapes user input before building a RegExp:
```js
const safe = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const re = new RegExp(safe, 'i');
```
This prevents a malformed input like `(` from triggering catastrophic backtracking.

**Mongoose error mapping** — `handleMongooseError()` converts:
- `code 11000` (duplicate key) → `ApiError(409, 'DUPLICATE_EMAIL')`
- `ValidationError` → `ApiError(422, 'VALIDATION_ERROR', ..., details[])`
- `CastError` (bad ObjectId) → `ApiError(404, 'NOT_FOUND')`

### How to Run

```bash
cd week3-database-integration
cp .env.example .env
# Edit .env: set MONGODB_URI to your MongoDB connection string
npm install
node server.js
# API live at http://localhost:3000
```

---

## Week 4 — Full-Stack Integration

**Goal:** Connect the Week 1 frontend to the Week 3 backend. Wire the waitlist form to the live API, add a real-time admin dashboard to manage leads, and keep everything clean — no CORS hacks, no spaghetti code.

### What Was Built

The complete Nexus AI product: landing page + backend + admin panel, all working together.

**Client additions over Week 1:**
- `js/api.js` — thin fetch wrapper with centralized error handling and `ApiError` class (mirrors the server's error format)
- `js/config.js` — API base URL config (switches between `localhost:3000` and production)
- `js/waitlist.js` — form submission: talks to `POST /api/leads`, maps server validation errors back to form fields, shows toast notifications
- `admin.html` + `js/admin.js` — full admin dashboard (see below)
- `css/admin.css` — admin-specific styles

### Admin Dashboard

A separate page (`admin.html`) for managing waitlist leads:

- **Four explicit UI states**: loading skeleton, success (table), empty, error-with-retry — only one shows at a time via a `showState()` function
- **Stat cards** — animated count-up for Total, New, Contacted, Converted
- **Search** — debounced (350ms), escapes regex special characters, calls the API on each keystroke pause
- **Status filter** — dropdown that filters by lead status (new / contacted / converted / rejected)
- **Actions** — "Contact" button (PATCH to set status: contacted), Delete button (DELETE with confirmation). Optimistic UI for contact: badge updates instantly without a full reload.
- **Theme toggle** — shares the `nexus-theme` localStorage key with the landing page; switching theme on either page persists for both
- **Custom cursor** — identical LERP=0.42 cursor system mirrored from the landing page
- **XSS-safe rendering** — all lead data injected via `textContent`, never `innerHTML`

### Architecture — Monorepo with Separate Server/Client

```
week4-fullstack-integration/
├── client/                  ← Static frontend (served by Live Server or any HTTP server)
│   ├── index.html
│   ├── admin.html
│   ├── css/
│   │   ├── style.css        ← Shared design system (extends Week 1)
│   │   └── admin.css        ← Admin-specific components
│   └── js/
│       ├── config.js        ← API base URL
│       ├── api.js           ← fetch wrapper + ApiError class
│       ├── script.js        ← Landing page (cursor, nav, animations, theme)
│       ├── waitlist.js      ← Waitlist form submission
│       └── admin.js         ← Admin dashboard (ES module)
└── server/                  ← Node.js/Express backend (identical to Week 3)
    ├── server.js
    └── src/
        ├── app.js
        ├── config/db.js
        ├── models/Lead.js
        ├── controllers/leads.controller.js
        ├── services/leads.service.js
        ├── routes/leads.routes.js
        ├── middleware/
        ├── validators/
        └── utils/
```

### CORS Setup

The server allows requests from Live Server's default origin (`http://localhost:5500`) in development. The `cors` npm package is configured in `src/app.js`.

### How to Run

**Terminal 1 — Start the API:**
```bash
cd week4-fullstack-integration/server
cp .env.example .env          # fill in MONGODB_URI
npm install
node server.js                # running on http://localhost:3000
```

**Terminal 2 — Serve the frontend:**
```bash
# Use VS Code Live Server extension and open client/index.html
# OR use any static file server:
npx serve week4-fullstack-integration/client
# Frontend at http://localhost:5500 (or the port Live Server picks)
```

Then open:
- `http://localhost:5500/index.html` — landing page with live waitlist form
- `http://localhost:5500/admin.html` — leads admin dashboard

---

## Security Practices Applied Across the Project

| Practice | Where | Detail |
|----------|-------|--------|
| XSS prevention | Week 4 admin.js, waitlist.js | All user data injected via `textContent`, never `innerHTML` |
| ReDoS protection | Week 3 & 4 service layer | User search input escaped with `replace(/[.*+?^${}()|[\]\\]/g, '\\$&')` before RegExp construction |
| API field hygiene | Week 3 & 4 Lead model | `toJSON` transform strips `_id` and `__v`; virtual `id` string exposed instead |
| `.lean()` avoidance | Week 3 & 4 service layer | Full Mongoose documents used so `toJSON` transform always runs |
| Input validation | All backend weeks | Both client-side (fast UX feedback) and server-side (real gate) |
| Structured errors | All backend weeks | Every error has `status`, `code`, `message`, optional `details[]` — never raw stack traces to clients |
| `.env` hygiene | Week 3 & 4 | `.env` gitignored, `.env.example` committed with placeholder values |

---

## Running All Weeks Side-by-Side

| Week | What you need | Start command |
|------|---------------|---------------|
| Week 1 | Nothing | Open `week1-responsive-frontend/index.html` in browser |
| Week 2 | Node.js ≥ 18 | `cd week2-backend-api && npm i && node server.js` |
| Week 3 | Node.js ≥ 18 + MongoDB | `cd week3-database-integration && npm i && node server.js` |
| Week 4 | Node.js ≥ 18 + MongoDB + Live Server | Start server, then open client in Live Server |

---

## MongoDB Setup

Weeks 3 and 4 require a running MongoDB instance. Choose either:

**Option A — MongoDB Atlas (cloud, recommended)**
1. Create a free cluster at [cloud.mongodb.com](https://cloud.mongodb.com)
2. Add a database user under **Database Access**
3. Whitelist your IP under **Network Access** (or allow `0.0.0.0/0` for development)
4. Click **Connect → Drivers**, copy the connection string
5. Paste it into `.env` as `MONGODB_URI`:
   ```
   MONGODB_URI=mongodb+srv://<user>:<password>@cluster0.xxxxx.mongodb.net/nexus-ai
   ```

**Option B — Local MongoDB**
1. Install MongoDB Community: [docs.mongodb.com/manual/installation](https://docs.mongodb.com/manual/installation/)
2. Start the service: `mongod --dbpath /data/db`
3. Set in `.env`:
   ```
   MONGODB_URI=mongodb://localhost:27017/nexus-ai
   ```

**Environment file setup (both weeks 3 & 4):**
```bash
cp .env.example .env
# Then edit .env and fill in MONGODB_URI and PORT (default 3000)
```

The `.env` file is gitignored. Never commit credentials. The `.env.example` committed to the repo contains only placeholder values.

---

## Folder Structure

```
DecodeLabs-Internship/
│
├── README.md
│
├── week1-responsive-frontend/
│   ├── index.html
│   ├── css/style.css
│   └── js/script.js
│
├── week2-backend-api/
│   ├── server.js
│   ├── package.json
│   └── src/
│       ├── app.js
│       ├── routes/leads.routes.js
│       ├── controllers/leads.controller.js
│       ├── services/leads.service.js
│       ├── store/leadStore.js
│       ├── validators/lead.validator.js
│       ├── middleware/
│       │   ├── errorHandler.js
│       │   └── notFound.js
│       └── utils/
│           ├── ApiError.js
│           └── respond.js
│
├── week3-database-integration/
│   ├── server.js
│   ├── package.json
│   ├── .env.example
│   └── src/
│       ├── app.js
│       ├── config/db.js
│       ├── models/Lead.js
│       ├── routes/leads.routes.js
│       ├── controllers/leads.controller.js
│       ├── services/leads.service.js
│       ├── validators/lead.validator.js
│       ├── middleware/
│       └── utils/
│
└── week4-fullstack-integration/
    ├── client/                        ← Static frontend
    │   ├── index.html                 ← Landing page
    │   ├── admin.html                 ← Admin dashboard
    │   ├── css/
    │   │   ├── style.css              ← Shared design system (~3000 lines)
    │   │   └── admin.css              ← Admin-only components
    │   └── js/
    │       ├── config.js              ← API base URL config
    │       ├── api.js                 ← fetch wrapper + ApiError class
    │       ├── script.js              ← Landing page logic
    │       ├── waitlist.js            ← Form submission handler
    │       └── admin.js              ← Admin dashboard (ES module)
    └── server/                        ← Express + MongoDB backend
        ├── server.js
        ├── package.json
        ├── .env.example
        └── src/
            ├── app.js
            ├── config/db.js
            ├── models/Lead.js
            ├── routes/, controllers/,
            ├── services/, validators/,
            ├── middleware/, utils/
```

---

## Author

**Nikhil** — DecodeLabs Internship, 2026
