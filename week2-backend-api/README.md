# Week 2 — Backend API Development
### Nexus AI Waitlist Leads API (In-Memory)

**DecodeLabs Internship — Project 2**

> **Architecture:** This is the *Process* layer — the cognitive backend that validates, stores, and serves lead data. The frontend (Week 1) is the face; this is the brain. A database is not yet connected (data resets on server restart) — that happens in Week 3.

---

## Quick Start

```bash
cd week2-backend-api
npm install
npm start
# → Server runs on http://localhost:3000
```

For development with auto-restart (Node 18.11+):
```bash
npm run dev
```

---

## API Reference

**Base URL:** `http://localhost:3000`

**Response Envelope:**
```json
// Success
{ "success": true,  "data": <payload> }
// Error
{ "success": false, "error": { "code": "...", "message": "...", "details": [] } }
```

### Endpoints

| Method | Path | Description | Success |
|--------|------|-------------|---------|
| GET | `/api/health` | Server health check | 200 |
| GET | `/api/leads` | List all leads (`?status=new&search=acme`) | 200 |
| GET | `/api/leads/:id` | Get single lead | 200 |
| POST | `/api/leads` | Create a lead | 201 |
| PATCH | `/api/leads/:id` | Partial update (e.g. change status) | 200 |
| PUT | `/api/leads/:id` | Full replace | 200 |
| DELETE | `/api/leads/:id` | Delete a lead | 204 |

**Lead fields (POST body):**
```json
{
  "name":     "Ada Lovelace",     // required, 2–80 chars
  "email":    "ada@example.com",  // required, unique
  "company":  "Analytical Engines", // optional
  "teamSize": "11-50",            // optional: 1 | 2-10 | 11-50 | 51-200 | 200+
  "useCase":  "Automate workflows"  // optional, ≤500 chars
}
```

---

## Test with curl

```bash
# Health check
curl http://localhost:3000/api/health

# List all leads (3 seeded at startup)
curl http://localhost:3000/api/leads

# Filter by status
curl "http://localhost:3000/api/leads?status=new"

# Search
curl "http://localhost:3000/api/leads?search=axiom"

# Create lead (expect 201)
curl -X POST http://localhost:3000/api/leads \
  -H "Content-Type: application/json" \
  -d '{"name":"Ada Lovelace","email":"ada@example.com","company":"Analytical Engines","teamSize":"2-10"}'

# Validation error (expect 422 with details[])
curl -X POST http://localhost:3000/api/leads \
  -H "Content-Type: application/json" \
  -d '{"name":"X"}'

# Duplicate email (expect 409) — repeat the Ada POST above

# Partial update — mark contacted (replace <id> with real id from GET)
curl -X PATCH http://localhost:3000/api/leads/<id> \
  -H "Content-Type: application/json" \
  -d '{"status":"contacted"}'

# Delete (expect 204, empty body)
curl -X DELETE http://localhost:3000/api/leads/<id>

# Unknown route (expect 404)
curl http://localhost:3000/api/nonexistent
```

---

## Architecture

```
week2-backend-api/
├── server.js              Entry point (starts HTTP listener)
└── src/
    ├── app.js             Express app — middleware + route mounting
    ├── routes/            URL → controller mapping
    ├── controllers/       HTTP layer (read req, send res)
    ├── services/          Business logic (dup check, etc.)
    ├── store/             THE SWAPPABLE SEAM — in-memory array
    │                      Week 3 replaces ONLY this file with Mongoose
    ├── validators/        Input validation (field → error message)
    ├── middleware/        CORS, errorHandler, notFound
    └── utils/             ApiError class, respond helpers
```

**Key design decisions:**
- `store/leadStore.js` is async-shaped even though it's synchronous — so Week 3 slots in without changing callers.
- Duplicate email returns `409`, not `422` — these are semantically different errors.
- `204 No Content` on DELETE (success with no body) — correct REST.
- Error handler is the last middleware so all thrown errors centralize there.

---

## Status Codes Used

| Code | Meaning |
|------|---------|
| 200 | OK — request succeeded |
| 201 | Created — new lead saved |
| 204 | No Content — lead deleted |
| 400 | Bad Request — malformed JSON |
| 404 | Not Found — unknown id or route |
| 409 | Conflict — duplicate email |
| 422 | Unprocessable Entity — validation failed |
| 500 | Internal Server Error — unexpected crash |
