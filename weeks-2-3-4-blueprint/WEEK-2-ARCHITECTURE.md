# Week 2 — Backend API — End-to-End Architecture

**Project:** DecodeLabs Full-Stack Internship, Project 2
**Brief (verbatim goal):** *"Develop a simple backend API to handle application logic."*
**Brief requirements:** Create API endpoints (GET/POST) · Handle user input and responses · Validate basic data.
**Our build:** The `/api/leads` REST API for the Nexus AI waitlist — data held **in memory** (no database this week). This is the "Process" (cognitive) layer of the product.

> Read `00-STRATEGY-AND-GIT-GUIDE.md` §5 first — it holds the shared contract (resource fields, endpoints, envelope, status codes) that this week implements. This file expands that contract into a concrete Week 2 build.

---

## 1. Goal and scope

**In scope this week:**
- A running Express server on `http://localhost:3000`.
- Full CRUD over an in-memory array of leads via the stable `/api/leads` contract.
- Input validation with correct status codes (422/409/400/404).
- Consistent success/error envelope.
- CORS enabled, centralized error handling, 404 handler, health check.

**Explicitly OUT of scope (deferred to later weeks):**
- No database — leads live in a JS array and reset when the server restarts. (Week 3 adds MongoDB.)
- No frontend — tested with `curl`/Postman/REST client. (Week 4 wires the UI.)
- No auth/login, no pagination beyond simple filters, no file uploads.

The brief only asks for GET/POST + validation. We deliver the full CRUD surface (GET/POST/PATCH/PUT/DELETE) because it costs little extra against an array, future-proofs Weeks 3–4 (same contract, zero rewrites), and showcases idempotency knowledge the DecodeLabs deck explicitly tests. This is a deliberate over-delivery, not scope creep.

---

## 2. Why this design (the "brain" rationale)

- **In-memory first is correct pedagogy.** Week 2's job is *application logic* — routing, validation, status codes, response shaping. Introducing a database now would muddy that. By keeping storage as a swappable array behind a thin data layer, Week 3 becomes a clean drop-in replacement.
- **A repository/service seam from day one.** All array access is funneled through one module (`leadStore`). In Week 3 we replace only that module with Mongoose calls; routes, validation, and controllers stay byte-for-byte identical. That seam is the single most valuable architectural decision of the whole package.
- **The contract is frozen now.** Endpoints, field names, envelope, and status codes are finalized this week so Weeks 3–4 never have to change the API surface.

---

## 3. Folder structure

```
week2-backend-api/
├── README.md                 # what it is, how to run, curl examples
├── package.json              # deps + scripts
├── .gitignore                # node_modules/, .env, etc.
├── server.js                 # entry point: builds app, starts listening
└── src/
    ├── app.js                # Express app: middleware + route mounting + error handlers
    ├── routes/
    │   └── leads.routes.js    # maps HTTP verbs+paths to controller functions
    ├── controllers/
    │   └── leads.controller.js # request→response logic for each endpoint
    ├── services/
    │   └── leads.service.js    # business logic; talks to the store
    ├── store/
    │   └── leadStore.js        # THE SWAPPABLE SEAM: in-memory array (Week 3 swaps this)
    ├── validators/
    │   └── lead.validator.js   # input validation → returns list of field errors
    ├── middleware/
    │   ├── errorHandler.js     # centralized error → envelope + status
    │   └── notFound.js         # 404 for unknown routes
    └── utils/
        ├── ApiError.js         # custom error class carrying a status code + code
        └── respond.js          # helpers: sendSuccess(res, ...) / sendError(res, ...)
```

**Why layered (routes → controller → service → store):** each layer has one job. Routes know URLs. Controllers know HTTP (read req, send res). Services know business rules. The store knows persistence. This is standard professional Express structure and makes the Week 3 swap trivial (only `store/` changes). For an intern project it also reads as obviously well-organized to a reviewer.

---

## 4. The data layer (the swappable seam)

`leadStore.js` owns a module-level array and exposes an async-shaped API *even though it's synchronous now*, so Week 3's async Mongoose calls slot in without changing callers:

```
findAll({ status, search })  → Lead[]
findById(id)                 → Lead | null
create(data)                 → Lead            (assigns id, status='new', createdAt)
update(id, partial)          → Lead | null     (merge; used by PATCH)
replace(id, data)            → Lead | null     (full replace of editable fields; PUT)
remove(id)                   → boolean         (true if deleted)
existsByEmail(email, exceptId?) → boolean      (for duplicate detection → 409)
```

- IDs in Week 2: use `crypto.randomUUID()` (built into Node) so they're string IDs — same *type* as Mongo's `_id` string, so Week 4 code doesn't care which week it's talking to.
- `createdAt`: `new Date().toISOString()`.
- Seed the array with **2–3 example leads** at startup so a reviewer hitting `GET /api/leads` immediately sees data.

Every function returns plain objects matching §5.1 of the strategy guide. `update`/`replace`/`create` re-run uniqueness checks so the 409 path is real even in memory.

---

## 5. Request lifecycle (one POST, end to end)

```
Client (curl/Postman)
  │  POST /api/leads  { name, email, company, teamSize, useCase }
  ▼
express.json()            → parses body to req.body (400 if malformed JSON)
  ▼
cors()                    → adds Access-Control-Allow-* headers
  ▼
leads.routes.js           → matches POST /api/leads → controller.createLead
  ▼
leads.controller.js       → calls validator; on errors throws ApiError(422, details)
  ▼
lead.validator.js         → checks required/format/enum → returns errors[]
  ▼
leads.service.js          → checks existsByEmail (409 if dup) → store.create(...)
  ▼
leadStore.js              → pushes to array, returns the new lead
  ▼
controller               → respond.sendSuccess(res, 201, newLead)
  ▼
Client receives           201 { success:true, data:{ ...lead } }

(any thrown ApiError / unexpected error)
  ▼
errorHandler.js           → maps to { success:false, error:{...} } + status
```

This mirrors the deck's **Input → Process → Output** model: the request is the input, the service/validator/store is the process, the JSON response is the output.

---

## 6. Endpoint-by-endpoint spec

All paths are under `http://localhost:3000`. Envelope and codes per strategy §5.3–5.4.

### `GET /api/health` → `200`
Returns `{ success:true, data:{ status:"ok", uptime:<seconds> } }`. Lets Week 4 confirm the server is up.

### `GET /api/leads` → `200`
Returns all leads as an array in `data`. Optional query filters:
- `?status=new` — filter by status enum.
- `?search=acme` — case-insensitive substring match on `name`, `email`, or `company`.
Combine filters with AND. Invalid `status` value → `422`.

### `GET /api/leads/:id` → `200` | `404`
Returns the single lead, or `404` `{ code:"NOT_FOUND" }` if no lead has that id.

### `POST /api/leads` → `201` | `422` | `409` | `400`
Body (client-supplied fields only): `name` (req), `email` (req), `company?`, `teamSize?`, `useCase?`, `source?`.
- Missing/invalid fields → `422` with `details[]`.
- Duplicate email → `409` `{ code:"DUPLICATE_EMAIL" }`.
- Malformed JSON → `400`.
- Success → `201` with the created lead (server fills `id`, `status:"new"`, `createdAt`).
Server **ignores** any client-sent `id`, `status`, `createdAt` (never let the client set these).

### `PATCH /api/leads/:id` → `200` | `404` | `422` | `409`
Partial update. The common real use is `{ "status": "contacted" }` (admin moving a lead through the pipeline). Any subset of editable fields allowed; each present field is validated. Unknown id → `404`. Email change to an existing email → `409`.

### `PUT /api/leads/:id` → `200` | `404` | `422` | `409`
Full replace of the **editable** fields (`name`, `email`, `company`, `teamSize`, `useCase`, `source`, and `status`). Missing required fields → `422` (PUT replaces, so `name`/`email` are required again). Demonstrates idempotency: same PUT twice = same result. Server preserves `id` and `createdAt`, refreshes `updatedAt`.

### `DELETE /api/leads/:id` → `204` | `404`
On success, empty body with `204`. Unknown id → `404`.

---

## 7. Validation rules (the `lead.validator.js` contract)

Returns an array of `{ field, message }`; empty array = valid. Controller turns a non-empty array into `ApiError(422, "VALIDATION_ERROR", details)`.

| Field | Rule | Message on failure |
|-------|------|--------------------|
| `name` | required, string, trimmed length 2–80 | "Name is required and must be 2–80 characters" |
| `email` | required, matches a sane email regex, ≤ 254 chars | "A valid email address is required" |
| `company` | optional, string, ≤ 100 | "Company must be 100 characters or fewer" |
| `teamSize` | optional, one of the enum | "Team size must be one of: 1, 2-10, 11-50, 51-200, 200+" |
| `useCase` | optional, string, ≤ 500 | "Use case must be 500 characters or fewer" |
| `source` | optional, string, ≤ 50 | "Source must be 50 characters or fewer" |
| `status` (PATCH/PUT only) | one of the enum | "Status must be one of: new, contacted, converted, rejected" |

Validation principles to enforce (and to be able to explain in viva): **never trust the client**, validate on the server regardless of any frontend checks; normalize before storing (trim strings, lowercase email); reject unknown/over-long input rather than silently accepting it.

---

## 8. Error handling design

- **`ApiError` class:** `new ApiError(statusCode, code, message, details?)`. Thrown anywhere; caught centrally.
- **`errorHandler.js`** (Express error middleware, 4 args): if `err` is an `ApiError`, emit its status + `{ code, message, details }`. If it's a JSON parse error from `express.json()`, emit `400 BAD_REQUEST`. Otherwise log it server-side and emit a generic `500 INTERNAL_ERROR` — **never leak stack traces** to the client.
- **`notFound.js`:** any unmatched route → `404 { code:"NOT_FOUND", message:"Route not found" }`.
- Async controllers are wrapped so thrown/rejected errors reach the handler (a small `asyncHandler` wrapper or try/catch in each controller).

---

## 9. `package.json` (shape)

```json
{
  "name": "nexus-leads-api",
  "version": "1.0.0",
  "description": "Week 2 — in-memory REST API for Nexus AI waitlist leads",
  "main": "server.js",
  "scripts": {
    "start": "node server.js",
    "dev": "node --watch server.js"
  },
  "dependencies": {
    "express": "^4.19.2",
    "cors": "^2.8.5"
  }
}
```

Only two runtime dependencies. `--watch` is built into modern Node, so no `nodemon` needed (keeps deps minimal). If the reviewer's Node is < 18.11, they can still `npm start`.

---

## 10. How to run and test (put this in the README too)

```bash
cd week2-backend-api
npm install
npm start            # → "Nexus AI leads API running on http://localhost:3000"
```

Smoke tests (the README should list these verbatim):

```bash
# health
curl http://localhost:3000/api/health

# list seeded leads
curl http://localhost:3000/api/leads

# create (expect 201)
curl -X POST http://localhost:3000/api/leads \
  -H "Content-Type: application/json" \
  -d '{"name":"Ada Lovelace","email":"ada@example.com","company":"Analytical Engines","teamSize":"2-10"}'

# validation error (expect 422 with details)
curl -X POST http://localhost:3000/api/leads \
  -H "Content-Type: application/json" -d '{"name":"X"}'

# duplicate email (expect 409) — repeat the ada POST above

# partial update status (expect 200)
curl -X PATCH http://localhost:3000/api/leads/<id> \
  -H "Content-Type: application/json" -d '{"status":"contacted"}'

# delete (expect 204)
curl -X DELETE http://localhost:3000/api/leads/<id>

# unknown id (expect 404)
curl http://localhost:3000/api/leads/does-not-exist
```

---

## 11. Definition of done (Week 2)

- [ ] Server starts on `:3000`, prints a clear ready message.
- [ ] All 7 endpoints behave exactly per §6.
- [ ] Validation returns `422` with a `details[]` array.
- [ ] Duplicate email returns `409`; unknown id returns `404`; malformed JSON returns `400`.
- [ ] Every response uses the success/error envelope from strategy §5.3.
- [ ] CORS enabled; `GET /api/health` works.
- [ ] All data access goes through `leadStore.js` (the swappable seam) — no array touched directly in controllers/services.
- [ ] `.gitignore` present (`node_modules/`, `.env`); no `node_modules` committed.
- [ ] README documents concept, run steps, and the `curl` examples above.
- [ ] Committed to `week2-backend-api/`; folder link submitted as Task 2.

---

## 12. Hand-off to Week 3

Week 3 changes **only** `store/leadStore.js` (array → Mongoose model) and adds DB connection + `.env`. Routes, controllers, validators, middleware, and the entire contract stay identical. That is the whole reason this architecture exists.
