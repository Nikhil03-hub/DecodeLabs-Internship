# Week 3 — Database Integration
### Nexus AI Waitlist Leads API (MongoDB + Mongoose)

**DecodeLabs Internship — Project 3**

> **The upgrade:** Week 2's API was identical in contract but used an in-memory array — data disappeared on restart. Week 3 swaps **only the storage layer** (one file: `src/services/`) for MongoDB via Mongoose. Every route, controller, validator, and response is unchanged. This demonstrates clean layered architecture — the swappable seam principle.

---

## Prerequisites

- Node.js 18+
- A free [MongoDB Atlas](https://cloud.mongodb.com/) cluster (free tier is fine)

## Quick Start

```bash
cd week3-database-integration
npm install
cp .env.example .env        # then fill in your MONGO_URI
npm start
```

**Getting your Atlas URI:**
1. Atlas → your cluster → Connect → Drivers → Node.js
2. Copy the URI, replace `<password>` with your DB user's password
3. Add `/nexus-leads` as the database name before the `?` query string

---

## What changed from Week 2

| Layer | Week 2 | Week 3 |
|-------|---------|--------|
| Routes | Same | Same |
| Controllers | Same | Same |
| Validators | Same | Same |
| Service | Calls leadStore (array) | Calls Mongoose model |
| Storage | In-memory array (reset on restart) | MongoDB Atlas (persistent) |
| New files | — | `src/config/db.js`, `src/models/Lead.js`, `.env` |

This is the Week 3 thesis in one table: isolate the storage seam so every other layer is reusable.

---

## API Reference

Same as Week 2 — base URL `http://localhost:3000`. See Week 2 README for full endpoint table and curl examples.

**Lead schema (MongoDB collection: `leads`):**
```
name       String  required, 2–80 chars
email      String  required, unique, lowercase
company    String  optional, ≤100 chars
teamSize   String  optional: 1 | 2-10 | 11-50 | 51-200 | 200+
useCase    String  optional, ≤500 chars
status     String  new | contacted | converted | rejected (default: new)
source     String  optional, ≤50 chars (default: website)
createdAt  Date    auto-set by Mongoose timestamps
updatedAt  Date    auto-updated by Mongoose timestamps
```

---

## Architecture

```
week3-database-integration/
├── .env.example        Add MONGO_URI here (copy to .env)
├── server.js           Entry: connects DB first, then starts HTTP
└── src/
    ├── config/
    │   └── db.js       Mongoose.connect() — called once at startup
    ├── models/
    │   └── Lead.js     Mongoose schema + model (THE storage layer)
    ├── services/       Business logic — talks to Lead model (not an array)
    ├── controllers/    HTTP layer — identical to Week 2
    ├── validators/     Validation rules — identical to Week 2
    ├── routes/         URL mapping — identical to Week 2
    └── middleware/     CORS, error handler, 404 — identical to Week 2
```

---

## Key Concepts Demonstrated

**Schema Design** — `Lead.js` defines the blueprint before data is stored. Every field has type, constraints, and error messages. MongoDB enforces `unique: true` on email at the index level.

**ORM (Mongoose)** — Instead of raw MongoDB queries (`db.collection('leads').find()`), we use expressive ORM methods (`Lead.find()`, `Lead.findByIdAndUpdate()`). Mongoose also handles type coercion, validation, and the `__v` version key.

**Data Persistence** — Unlike Week 2's array, data survives server restarts because it lives in Atlas.

**Security** — email is stored lowercased, trimmed. Never commit `.env`. SQL Injection equivalent (NoSQL injection) is prevented by Mongoose's typed schemas.

**Relationships** — This week uses a flat schema (no relationships). Primary Key = MongoDB's `_id` (ObjectId), exposed as `id` string in responses.
