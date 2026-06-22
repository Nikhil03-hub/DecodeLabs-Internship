# Week 3 — Database Integration — End-to-End Architecture

**Project:** DecodeLabs Full-Stack Internship, Project 3
**Brief (goal):** *Connect the backend with a database* — schema design, CRUD, data handling.
**Brief themes (from the P3 deck):** the 4 Pillars of data, SQL vs NoSQL, primary/foreign keys, ORM/ODM, constraints (required, unique, enum), and preventing SQL/NoSQL injection.
**Our build:** Take the Week 2 `/api/leads` API and make leads **persist** in **MongoDB Atlas** via **Mongoose**. The API surface does not change at all — only the storage layer does. This is the product's "long-term memory."

> Prerequisite: `00-STRATEGY-AND-GIT-GUIDE.md` §5 (shared contract) and `WEEK-2-ARCHITECTURE.md`. Week 3 = Week 2 with the swappable seam replaced.

---

## 1. Goal and scope

**In scope:**
- A `Lead` Mongoose schema/model enforcing required, unique (email), enum (teamSize, status), length limits, and timestamps.
- A MongoDB Atlas free-tier (M0) cluster the API connects to via a connection string in `.env`.
- The same 7 endpoints from Week 2, now reading/writing the database.
- Database-level integrity: unique index on email, schema validation, safe queries.
- Connection lifecycle handling (connect on boot, fail fast with a clear message, graceful shutdown).
- An optional seed script to populate example leads.

**Out of scope:** frontend (Week 4), auth, transactions/multi-document atomic ops, aggregation pipelines beyond simple filters.

---

## 2. The key idea: only the seam changes

Week 2 routed all persistence through `src/store/leadStore.js` (an array). Week 3 replaces that one module with a Mongoose-backed implementation exposing the **same function signatures**:

```
findAll({status, search})  findById(id)  create(data)
update(id, partial)        replace(id, data)  remove(id)  existsByEmail(email, exceptId?)
```

Because the signatures are identical and were already `async` in Week 2, **controllers, services, validators, routes, middleware, and the entire contract are unchanged.** You are demonstrating that a clean architecture lets you change the database without rewriting the app. State that explicitly in your README and viva — it's the headline achievement.

> Practical note for the build: start `week3-database-integration/` as a copy of `week2-backend-api/`, then (a) add `mongoose` + `dotenv`, (b) add `src/config/db.js` and `src/models/Lead.model.js`, (c) rewrite `src/store/leadStore.js` to use the model, (d) add `.env`/`.env.example`. Nothing else should need edits beyond wiring the DB connect into `server.js`.

---

## 3. Folder structure

```
week3-database-integration/
├── README.md                  # + Atlas setup steps and the "only the seam changed" note
├── package.json               # adds mongoose, dotenv
├── .gitignore                 # MUST ignore .env
├── .env                       # real MONGODB_URI — NEVER committed
├── .env.example               # committed: MONGODB_URI=, PORT=
├── server.js                  # connect to DB, THEN start listening
└── src/
    ├── app.js                 # unchanged from Week 2
    ├── config/
    │   └── db.js              # NEW: mongoose.connect with error/lifecycle handling
    ├── models/
    │   └── Lead.model.js      # NEW: the Mongoose schema + model
    ├── store/
    │   └── leadStore.js       # REWRITTEN: same signatures, now Mongoose calls
    ├── routes/leads.routes.js          # unchanged
    ├── controllers/leads.controller.js # unchanged
    ├── services/leads.service.js        # unchanged
    ├── validators/lead.validator.js     # unchanged (keep app-level validation too)
    ├── middleware/errorHandler.js       # + map Mongoose errors (see §6)
    ├── middleware/notFound.js           # unchanged
    └── utils/ (ApiError.js, respond.js) # unchanged
    └── scripts/
        └── seed.js            # OPTIONAL: wipe + insert sample leads
```

---

## 4. The `Lead` Mongoose schema (the heart of Week 3)

This is where the deck's concepts (constraints, schema design, ODM) become concrete.

| Field | Mongoose definition | Demonstrates |
|-------|---------------------|--------------|
| `name` | `{ type:String, required:[true,'Name is required'], trim:true, minlength:2, maxlength:80 }` | required + length constraints |
| `email` | `{ type:String, required:true, unique:true, lowercase:true, trim:true, match:[emailRegex,'Invalid email'] }` | **unique index**, normalization, format constraint |
| `company` | `{ type:String, trim:true, maxlength:100 }` | optional + length |
| `teamSize` | `{ type:String, enum:['1','2-10','11-50','51-200','200+'] }` | **enum constraint** |
| `useCase` | `{ type:String, trim:true, maxlength:500 }` | optional + length |
| `status` | `{ type:String, enum:['new','contacted','converted','rejected'], default:'new', index:true }` | enum + default + index for filtering |
| `source` | `{ type:String, trim:true, maxlength:50, default:'landing_page' }` | default |

Schema options:
- `{ timestamps: true }` → Mongoose auto-manages `createdAt`/`updatedAt` (replaces Week 2's manual timestamps).
- A `toJSON` transform that **exposes `_id` as `id`** and removes `__v`, so the API output is byte-identical to Week 2 (clients still see `id`, never `_id`). This keeps the contract intact for Week 4.
- `email` uniqueness is enforced by a **unique index** — call `Lead.syncIndexes()` (or rely on `autoIndex` in dev) so the index actually exists on the cluster.

### SQL vs NoSQL framing (for the README + viva)
A SQL row maps to a Mongo **document**; a SQL table maps to a **collection**. There's no `CREATE TABLE` — the schema is enforced in the app layer by Mongoose (the ODM), not the database engine. The primary key is Mongo's `_id` (an ObjectId), the analog of a SQL auto-increment PK. We have no foreign keys this week because a lead is a single self-contained entity; if Nexus AI later added (say) a `note` belonging to a lead, that 1-to-many relationship would be modeled by storing the lead's `_id` as a reference on each note — the NoSQL analog of a foreign key.

---

## 5. The rewritten `leadStore.js` (signature-for-signature)

| Function | Week 2 (array) | Week 3 (Mongoose) |
|----------|----------------|-------------------|
| `findAll({status,search})` | `array.filter` | `Lead.find(buildQuery(status, search)).sort('-createdAt')` |
| `findById(id)` | `array.find` | `Lead.findById(id)` (guard invalid ObjectId → return null) |
| `create(data)` | push | `Lead.create(data)` |
| `update(id, partial)` | merge | `Lead.findByIdAndUpdate(id, partial, { new:true, runValidators:true })` |
| `replace(id, data)` | overwrite | `Lead.findOneAndReplace({_id:id}, data, { new:true, runValidators:true })` (preserve createdAt) |
| `remove(id)` | splice | `Lead.findByIdAndDelete(id)` → boolean |
| `existsByEmail(email, exceptId?)` | scan | `Lead.exists({ email:lowercased, _id:{ $ne:exceptId } })` |

Key safety points:
- **Always pass `runValidators:true`** on update/replace so schema constraints apply to mutations, not just inserts.
- **Guard invalid ids:** `mongoose.isValidObjectId(id)` before querying; if invalid, return null so the controller produces a clean `404` instead of a thrown CastError.
- The `search` filter uses Mongoose query objects with `$regex`/`$options:'i'` over name/email/company — **passing user input as query *values*, never concatenating it into a query string.** This is the NoSQL-injection-prevention story (parameterized-query equivalent): Mongoose treats input as data, not executable query structure.

---

## 6. Error handling additions

Extend `errorHandler.js` to translate Mongoose/Mongo errors into the standard envelope:

- **Mongoose `ValidationError`** → `422 VALIDATION_ERROR`, mapping each `err.errors[field]` into `details[]`. (This is a safety net; app-level validation in `lead.validator.js` still runs first and catches most cases with friendlier messages.)
- **Duplicate key error** (`err.code === 11000`, the unique email index) → `409 DUPLICATE_EMAIL`.
- **`CastError`** (bad ObjectId that slipped through) → `404 NOT_FOUND`.
- Everything else → `500` with a generic message (full error logged server-side).

Keeping both app-level validation *and* schema-level constraints is intentional defense-in-depth: the app gives nice messages; the database guarantees integrity even if a bug bypasses the app.

---

## 7. Connection lifecycle (`config/db.js` + `server.js`)

- `db.js` exports `connectDB()` that calls `mongoose.connect(process.env.MONGODB_URI)` with sensible options, logs success, and on failure logs a clear message and `process.exit(1)` (fail fast — don't run an API with no database).
- Register listeners for `connection` `error` and `disconnected` events to log them.
- `server.js` flow: load `dotenv` → `await connectDB()` → **then** `app.listen(...)`. Never accept requests before the DB is ready.
- Handle `SIGINT` to close the Mongoose connection gracefully on shutdown.

---

## 8. Environment & security

`.env` (NEVER committed):
```
MONGODB_URI=mongodb+srv://<user>:<password>@<cluster>.mongodb.net/nexus_ai?retryWrites=true&w=majority
PORT=3000
```
`.env.example` (committed):
```
MONGODB_URI=your-mongodb-atlas-connection-string-here
PORT=3000
```
- `.gitignore` MUST contain `.env`. The connection string embeds a DB username and password — committing it is a real credential leak and a graded-quality failure. Be ready to explain this in viva.
- In Atlas: create a free **M0** cluster, a database user with a strong password, and an IP allow-list entry (`0.0.0.0/0` is acceptable for a student project; mention that production would scope it tighter).

---

## 9. MongoDB Atlas setup steps (put in README)

1. Create a free MongoDB Atlas account → build a free **M0** cluster.
2. Database Access → add a user (username + password); save them.
3. Network Access → add IP `0.0.0.0/0` (allow from anywhere — fine for this project).
4. Cluster → Connect → "Connect your application" → copy the connection string.
5. Paste it into `.env` as `MONGODB_URI`, replacing `<password>` and adding `/nexus_ai` as the db name.
6. `npm install`, then optionally `npm run seed`, then `npm start`.

---

## 10. How to run and test

```bash
cd week3-database-integration
npm install
cp .env.example .env     # then edit .env with your real Atlas URI
npm run seed             # optional: inserts sample leads
npm start                # connects to Atlas, then listens on :3000
```

Run the **same** `curl` suite from Week 2 — every response must be identical in shape and codes. The new proof points:
- Restart the server and `GET /api/leads` again → **data persists** (the whole point of Week 3).
- POST a duplicate email → `409` driven by the **database unique index**, not just app logic (test by temporarily disabling app-level dup check if you want to prove the index works).
- Check the data appears in the Atlas web UI (Collections → `leads`).

---

## 11. Definition of done (Week 3)

- [ ] `Lead` schema enforces required `name`/`email`, unique `email`, enum `teamSize`/`status`, length limits, timestamps.
- [ ] API output still exposes `id` (not `_id`) and omits `__v` — contract unchanged from Week 2.
- [ ] All 7 endpoints work against Atlas; data persists across restarts.
- [ ] Duplicate email → 409 (unique index); invalid id → 404 (no crash); validation → 422.
- [ ] `update`/`replace` run schema validators (`runValidators:true`).
- [ ] `.env` gitignored; `.env.example` committed; README has Atlas setup steps.
- [ ] Only `store/leadStore.js` + new `config/`, `models/` changed vs Week 2 — README states this.
- [ ] Committed to `week3-database-integration/`; folder link submitted as Task 3.

---

## 12. Hand-off to Week 4

Week 4 imports this exact server (as `week4-fullstack-integration/server/`) unchanged and adds a `client/` — the Nexus AI frontend calling these endpoints with `fetch()`. The API is now final.
