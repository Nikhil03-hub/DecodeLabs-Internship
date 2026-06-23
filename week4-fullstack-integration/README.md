# Week 4 — Full-Stack Integration

> **Nexus AI · DecodeLabs Internship**  
> Stack: Pure HTML5 + CSS3 + Vanilla JS · Node.js + Express · MongoDB Atlas + Mongoose  
> No frameworks. No bundlers. Just the platform.

---

## What this project does

Week 4 wires the Week 1 landing page (static UI) to the Week 3 REST API (MongoDB-backed).

**IPO Model — Input → Process → Output**

| Layer | What happens |
|-------|-------------|
| **Input** | User fills the waitlist form; `fetch()` builds a POST request (JSON body, CORS headers) |
| **Process** | Express validates, deduplicates, and persists the lead to MongoDB Atlas |
| **Output** | Success state replaces the form; Admin table renders the new row in real time |

Two pages ship:

- **`client/index.html`** — Nexus AI landing page with a real "Join the Waitlist" form
- **`client/admin.html`** — Lightweight admin dashboard (GET/PATCH/DELETE leads, live stats)

---

## Project structure

```
week4-fullstack-integration/
├── client/                     ← Frontend (open via Live Server)
│   ├── index.html              ← Landing page + waitlist form (Week 1 extended)
│   ├── admin.html              ← Admin dashboard
│   ├── css/
│   │   └── style.css           ← Week 1 base (~2361 lines) + Week 4 additions (~400 lines)
│   └── js/
│       ├── config.js           ← API_BASE_URL constant
│       ├── api.js              ← All fetch() calls centralised here
│       ├── waitlist.js         ← Form submit, field errors, toast, success state
│       └── admin.js            ← Load leads, skeleton, stats, contact, delete
│
└── server/                     ← Backend (identical to Week 3)
    ├── server.js               ← Entry point (dotenv → connectDB → listen)
    ├── .env.example            ← Copy to .env and add MONGO_URI
    ├── package.json
    └── src/
        ├── app.js              ← Express app + CORS + routes
        ├── config/db.js        ← Mongoose connection
        ├── models/Lead.js      ← Mongoose schema (timestamps, toJSON transform)
        ├── validators/         ← create / patch / replace validators
        ├── services/           ← Business logic (dedup, not-found handling)
        ├── controllers/        ← HTTP request/response layer
        ├── routes/             ← GET/POST /api/leads  GET/PATCH/PUT/DELETE /api/leads/:id
        ├── middleware/         ← errorHandler · notFound
        └── utils/              ← ApiError class · respond helpers
```

---

## Setup — 2 terminals

### Terminal 1 — Server

```bash
cd week4-fullstack-integration/server
npm install

# Create .env from the example
cp .env.example .env
# Edit .env and add your MongoDB Atlas connection string:
# MONGO_URI=mongodb+srv://<user>:<password>@<cluster>.mongodb.net/nexusai?retryWrites=true&w=majority
# PORT=3000

npm run dev     # node --watch server.js  (auto-restarts on change)
```

You should see:
```
[DB] MongoDB connected: <cluster-host>
[Server] Nexus AI API running on http://localhost:3000  (week 4, env: development)
```

### Terminal 2 — Client

Open `client/index.html` using **VS Code Live Server** (right-click → Open with Live Server).

> ⚠️ **Must use Live Server, not the `file://` protocol.**  
> `file://` sends a `null` Origin which CORS rejects.  
> Live Server serves on `http://127.0.0.1:5500` which is allow-listed.

---

## 6-step test script

| # | Action | Expected |
|---|--------|----------|
| 1 | Open `http://127.0.0.1:5500` | Landing page loads; hero CTA reads "Join the Waitlist" |
| 2 | Click "Join the Waitlist" / scroll to `#waitlist` | Glass form card visible |
| 3 | Submit with blank name | Red field border + "Please enter your full name" error |
| 4 | Submit valid data (name + email) | Spinner shows → form hides → green "You're on the list!" state |
| 5 | Submit the **same email** again | 409 → "This email is already on the waitlist" field error |
| 6 | Open `http://127.0.0.1:5500/admin.html` | Skeleton flashes → table renders with your new lead + seed data |
| 7 | Click **Contact** on a new lead | Badge updates to "contacted" (optimistic UI, PATCH to server) |
| 8 | Click **✕** → confirm | Row slides out, count decrements (DELETE → 204) |

---

## API reference

Base URL: `http://localhost:3000`

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/health` | Server + DB status |
| GET | `/api/leads` | List leads (optional `?status=new&search=aria`) |
| POST | `/api/leads` | Create lead |
| GET | `/api/leads/:id` | Get single lead |
| PATCH | `/api/leads/:id` | Partial update (e.g. `{ "status": "contacted" }`) |
| PUT | `/api/leads/:id` | Full replace |
| DELETE | `/api/leads/:id` | Delete (204 No Content) |

Response envelope:
```json
{ "success": true, "data": { ... } }
{ "success": false, "error": { "code": "DUPLICATE_EMAIL", "message": "...", "details": [] } }
```

---

## Key patterns (deck anti-patterns avoided)

```js
// ✅ Check response.ok BEFORE response.json()
// fetch() NEVER rejects on 4xx/5xx — it only rejects on network failure.
const payload = await response.json().catch(() => null);
if (!response.ok) throw new ApiError(payload?.error?.code, payload?.error?.message);

// ✅ async/await — no .then() chains
const data = await createLead({ name, email, ... });

// ✅ try/catch/finally — finally ALWAYS resets the spinner
try   { await createLead(data); showSuccess(); }
catch  (err) { showError(err); }
finally { setLoading(false); }   // ← runs whether success or failure

// ✅ textContent not innerHTML for user data (XSS prevention)
nameSpan.textContent = lead.name;   // safe
nameSpan.innerHTML   = lead.name;   // ← NEVER do this with user data
```

---

## Architecture note — the swappable seam

Week 2 used an in-memory `leadStore.js`.  
Week 3 replaced **only** that file with a Mongoose model.  
Week 4 copies the entire Week 3 server unchanged — proving the seam works.

The seam is the contract: every function in `leadStore.js` / `Lead.js` returns a `Promise`, so all callers (`leads.service.js`) are identical across both weeks.

---

## Admin panel note

The admin panel has **no authentication** — this is intentional for Week 4 scope.  
Week 4 teaches full-stack data flow, not auth.  
In production, protect `/admin.html` with middleware or a separate authenticated route.
