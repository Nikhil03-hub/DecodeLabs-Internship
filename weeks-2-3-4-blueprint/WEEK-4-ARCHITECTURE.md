# Week 4 — Full-Stack Integration — End-to-End Architecture

**Project:** DecodeLabs Full-Stack Internship, Project 4 (the "Optional Mastery Phase").
**Brief (goal):** *Integrate frontend with backend APIs.*
**Brief requirements:** Send requests from frontend to backend · Display dynamic data on the UI · Handle basic errors and responses.
**Brief skills:** API integration, asynchronous requests, full-stack flow.
**Our build:** Wire the **Nexus AI** frontend (Week 1's design system) to the **Week 3 leads API** using `fetch()`. A real "Join the waitlist" form that POSTs a lead, plus a lightweight **admin view** that GETs and renders all leads. This is the "spinal cord" connecting the face (UI) to the brain (API+DB).

> This week's design is built directly on the DecodeLabs Project 4 deck. Every section below maps to a slide so the reviewer/viva sees their own curriculum reflected back. Prerequisite reading: strategy §5, plus Weeks 2–3 architecture.

---

## 1. The mental model: Input → Process → Output (the deck's spine)

The deck frames a web app as a nervous system with three stages. Our Week 4 makes each concrete:

| Deck stage | What it is | Our implementation |
|------------|-----------|--------------------|
| **Stage 1 — Input (Sensory)** | Client sends an HTTP request across the network | User submits the waitlist form → `fetch('http://localhost:3000/api/leads', { method:'POST', ... })` |
| **Stage 2 — Process (Cognitive)** | Server receives, queries DB, packages JSON | The Week 3 Express+Mongoose API validates, writes to Atlas, returns the lead envelope |
| **Stage 3 — Output (Motor)** | Client receives payload, updates the DOM | Frontend parses JSON, shows a success state / renders the lead into the admin list |

The "Synthesis: Complete Nervous System Lifecycle" slide lists 8 steps for one click; §6 below implements them exactly.

---

## 2. Goal and scope

**In scope:**
- A **waitlist form** on the Nexus AI page that POSTs to `/api/leads` and shows loading → success/error states.
- An **admin view** (`admin.html`) that GETs `/api/leads` and renders them as cards/rows, with a live count, a status filter, and per-lead actions (mark contacted via PATCH, delete via DELETE).
- A single shared `api.js` module wrapping `fetch` with `response.ok` checks, JSON parsing, try/catch, and the standard envelope.
- Full async/await (no `.then` chains), CORS working across origins, defensive error handling, XSS-safe rendering.
- Loading, empty, and error UI states everywhere.

**Out of scope:** auth/login, real admin security (the admin page is a demo view, noted as such), pagination beyond the status filter, build tooling (still plain files, no bundler).

---

## 3. Folder structure

```
week4-fullstack-integration/
├── README.md                  # run BOTH client and server; the IPO story
├── server/                    # = the Week 3 API, copied in unchanged
│   ├── package.json
│   ├── .env / .env.example
│   └── src/ ...                # leads API on http://localhost:3000
└── client/                    # the Nexus AI frontend (Week 1 design system)
    ├── index.html             # landing page + the real waitlist form section
    ├── admin.html             # admin dashboard: list/filter/update/delete leads
    ├── css/
    │   └── style.css          # Week 1 tokens + new form/admin/toast/skeleton styles
    └── js/
        ├── config.js          # API_BASE_URL constant (one place to change)
        ├── api.js             # fetch wrapper: getLeads, createLead, updateLead, deleteLead
        ├── waitlist.js        # form handling: validate, submit, render states
        └── admin.js           # admin view: load, filter, render, actions
```

The server folder is literally Week 3 — don't fork the API logic. The client is where all new work happens.

> **Reuse Week 1, don't reinvent.** Bring over Week 1's `index.html` and `css/style.css` so the colors (Mocha Mousse `#A5856F`, Ethereal Blue `#A0D4E0`, Moonlit Grey `#F2F0EA`), fonts (Inter + Open Sans), BEM naming, and `[data-theme]` theming match exactly. The waitlist section replaces Week 1's dead `<a href="#">` CTA with a working form. When prompting Sonnet, paste Week 1's actual `index.html`/`style.css` so it extends the real design system.

---

## 4. The `fetch()` layer — `api.js` (the deck's "Native Skeleton")

The deck breaks a `fetch` into Endpoint / Configuration / Headers / Payload. `api.js` centralizes all four so every call is consistent and every response is handled the same way.

A single private helper does the heavy lifting:

```
async function request(path, { method='GET', body } = {}) {
  // ENDPOINT
  const url = `${API_BASE_URL}${path}`;
  // CONFIGURATION + HEADERS + PAYLOAD
  const options = { method, headers: { 'Content-Type': 'application/json' } };
  if (body) options.body = JSON.stringify(body);     // serialization
  let response;
  try {
    response = await fetch(url, options);              // returns a Promise
  } catch (networkErr) {
    // fetch only rejects on network failure, NOT on 4xx/5xx
    throw new ApiError('NETWORK', 'Could not reach the server. Check your connection.');
  }
  // 204 No Content → no body to parse
  if (response.status === 204) return null;
  // CHECK response.ok BEFORE parsing (deck: "Check response.ok before proceeding!")
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    const e = payload?.error || {};
    throw new ApiError(e.code || 'HTTP_'+response.status, e.message || 'Request failed', e.details);
  }
  return payload.data;   // unwrap the envelope → callers get clean data
}
```

Public functions built on it: `getLeads(filters)`, `getLead(id)`, `createLead(data)`, `updateLead(id, partial)`, `deleteLead(id)`, `getHealth()`. Each is one line calling `request(...)`.

**Why this matters (deck-mapped):**
- **`response.ok` before `response.json()`** — the deck's "Assuming a 404 throws a catch error" anti-pattern. `fetch` does NOT reject on 404/500; it resolves. If you blindly `.json()` a 404 HTML page you crash. We check `ok` first and throw our own error.
- **`JSON.stringify` on the way out, `response.json()` on the way in** — the deck's "Border Crossing" serialization/deserialization.
- **One try/catch around the network call** distinguishes a true network failure (fetch rejects) from an HTTP error status (fetch resolves) — two different error paths, both handled.

---

## 5. The waitlist form — `waitlist.js`

The form lives in `index.html` (replacing Week 1's placeholder CTA) with fields mapping to the lead contract: `name*`, `email*`, `company`, `teamSize` (a `<select>` of the enum), `useCase` (textarea). 

Submit handler flow:
1. `event.preventDefault()`.
2. **Client-side pre-validation** (fast feedback): required name/email, basic email pattern. Inline field errors. (Server still re-validates — client checks are UX, not security.)
3. Enter **loading state**: disable the submit button, show a spinner/"Joining…", clear old messages.
4. `await createLead(formData)` inside try/catch/**finally**.
   - **try:** on success → success state: hide the form or show a "You're on the list!" confirmation; reset fields.
   - **catch:** distinguish error types — a `422 VALIDATION_ERROR` maps `details[]` back onto the specific fields; a `409 DUPLICATE_EMAIL` shows "This email is already on the waitlist"; a `NETWORK` error shows "Couldn't reach the server, please try again"; anything else shows a generic friendly toast. **Never a blank screen, never a raw stack trace** (deck: "No Silent Failures").
   - **finally:** re-enable the button, hide the spinner (deck: "Use `.finally()` to clean up… regardless of success or failure").

This single handler demonstrates async/await, defensive try/catch/finally, graceful degradation, and status-code-driven branching — the heart of the grade.

---

## 6. The 8-step lifecycle (deck "Synthesis" slide) — admin "Load leads" click

When the admin opens `admin.html` (or clicks Refresh), this is the exact sequence, matching the deck's nervous-system lifecycle:

1. **Event:** user clicks "Load/Refresh" → triggers an `async` function.
2. **Shield up:** a `try { }` block opens around the whole operation.
3. **Request:** `fetch('http://localhost:3000/api/leads')` initiated → browser performs the **CORS preflight** check first (see §7).
4. **Pause:** `await` suspends the function (without freezing the page) while the server queries Atlas and responds.
5. **Check:** inspect `response.ok` — 200 → proceed; non-2xx → throw → jump to catch (error containment).
6. **Translate:** `await response.json()` deserializes raw text into a JS array.
7. **Inject:** loop the array with `.map()`, build DOM nodes with `document.createElement`, set `card.textContent = lead.name` (**never `innerHTML` with lead data** — XSS), `append` to the container.
8. **Cleanup:** `finally { }` hides the loading skeleton/spinner.

The admin view has three render states it must handle explicitly: **loading** (skeleton rows), **empty** ("No leads yet"), **error** (message + Retry button), and **success** (the list). All four are required.

---

## 7. CORS — why and how (deck "Network Security & The CORS Barrier")

In Week 4 the frontend and backend run on **different origins**:
- Frontend: served by VS Code Live Server at `http://127.0.0.1:5500` (or `http://localhost:5500`).
- Backend: `http://localhost:3000`.

Different port = different origin = the browser's **same-origin policy** blocks the call unless the server opts in. For non-simple requests (our POST/PATCH with `Content-Type: application/json`), the browser first sends an invisible **preflight `OPTIONS`** request asking permission; if the server doesn't return the right `Access-Control-Allow-*` headers, "the request dies in the browser" (deck's words).

**Resolution:** the backend already enables the `cors` middleware (from Week 2). For Week 4, configure it to allow the frontend origin explicitly:
```
app.use(cors({ origin: ['http://127.0.0.1:5500', 'http://localhost:5500'], methods:['GET','POST','PATCH','PUT','DELETE'] }));
```
(Allowing all origins with bare `cors()` also works for a student demo; scoping to the Live Server origin is the cleaner answer and a good viva point.) The README must tell the reviewer to run the frontend via Live Server (not `file://`, which has a `null` origin and breaks CORS).

---

## 8. Asynchronous correctness (deck "Intern Anti-Patterns" — avoid all four)

The grade hinges on writing "senior", not "junior", async code. The build must avoid each anti-pattern the deck calls out:

| Deck anti-pattern | What we do instead |
|-------------------|--------------------|
| Forgetting `await` (UI renders a `Promise{pending}`) | Every async call is `await`ed; lint your own code for bare `fetch(...)` without await. |
| `await` inside a `for` loop (serial, slow) | If we ever fire multiple requests (e.g. bulk actions), use `Promise.all([...])` to parallelize. Single loads use one request. |
| Assuming a 404 auto-throws (crash parsing HTML as JSON) | `api.js` checks `response.ok` before `.json()` and throws a typed error. |
| `console.log(error)` as "handling" in production | Errors surface to the user as a toast/inline message AND are logged for debugging — never swallowed. |

Also: use async/await exclusively (no `.then().then().catch()` "Promise hell" — the deck's "Outdated" column). Understand a Promise's lifecycle: pending → fulfilled or rejected.

---

## 9. Security & robustness checklist (deck-mapped)

- **XSS:** render all lead-supplied text with `textContent` / `createTextNode`, never `innerHTML`. (Deck security warning on the "UI Injection" slide.) If you must build markup strings, escape first.
- **No silent failures:** every catch produces a visible, human message; a blank white screen is the failure mode to avoid.
- **Graceful degradation:** error states include a **Retry** affordance, not a dead end.
- **`finally` cleanup:** spinners/disabled buttons always reset, success or failure.
- **Don't trust the client:** server-side validation (Weeks 2–3) is the real gate; client validation is only UX.
- **Config in one place:** `API_BASE_URL` lives in `config.js` so switching from localhost to a deployed URL is a one-line change.

---

## 10. UI states matrix (what to design for)

| Surface | Loading | Empty | Error | Success |
|---------|---------|-------|-------|---------|
| Waitlist form | button "Joining…", disabled | n/a | inline field errors (422) / toast (network/409/500) | "You're on the list!" confirmation |
| Admin list | skeleton rows | "No leads yet" panel | message + Retry button | rendered cards/rows + count |
| Per-lead action (PATCH/DELETE) | row shows pending | n/a | revert + toast | optimistic update or re-fetch |

Every cell is part of "Display dynamic data on UI" + "Handle basic errors and responses" from the brief.

---

## 11. How to run and test (README)

```bash
# Terminal 1 — backend
cd week4-fullstack-integration/server
npm install
cp .env.example .env        # add your Atlas URI
npm start                   # API on http://localhost:3000

# Frontend — open client/ with VS Code Live Server (Go Live)
# → serves at http://127.0.0.1:5500/week4-fullstack-integration/client/index.html
```

Test script (put in README):
1. Open `index.html` via Live Server. Submit the waitlist form with valid data → success state; confirm the lead appears in Atlas and in `admin.html`.
2. Submit with a bad email → inline 422 error, no navigation, no crash.
3. Submit the same email twice → "already on the waitlist" (409).
4. Stop the backend, submit again → friendly network-error toast (not a blank page). Restart, Retry works.
5. In `admin.html`: list renders with count; filter by status; mark a lead "contacted" (PATCH) → UI updates; delete a lead (DELETE) → row disappears.
6. DevTools → Network tab: confirm the preflight `OPTIONS` then the actual request; confirm `Access-Control-Allow-Origin` header present.

---

## 12. Definition of done (Week 4)

- [ ] Waitlist form POSTs a real lead; shows loading, success, and error (422/409/network) states.
- [ ] `admin.html` GETs and renders all leads with `.map()` + `textContent`, plus count, filter, and PATCH/DELETE actions.
- [ ] `api.js` checks `response.ok` before parsing; uses try/catch/finally; async/await only (no `.then` chains).
- [ ] CORS works between `:5500` and `:3000`; README says to use Live Server (not `file://`).
- [ ] All four UI states (loading/empty/error/success) handled on the admin view.
- [ ] Lead text rendered with `textContent` (XSS-safe); no `innerHTML` of user data.
- [ ] Visual design matches Week 1 tokens (colors, fonts, BEM, theme toggle still works).
- [ ] `server/` is the unchanged Week 3 API; `.env` gitignored.
- [ ] README explains running both halves + the Input→Process→Output story.
- [ ] Committed to `week4-fullstack-integration/`; folder link submitted as Task 4.

---

## 13. Viva one-liners (be able to say these)
- "fetch resolves on 404/500, so I check `response.ok` before `.json()` to avoid parsing an error page."
- "Different ports are different origins, so I enabled CORS; the browser sends a preflight OPTIONS for my JSON POST."
- "`await` pauses my async function without freezing the single-threaded UI; the event loop keeps the page responsive."
- "I render lead names with `textContent`, not `innerHTML`, to prevent XSS from user-supplied data."
- "`finally` resets my button and spinner whether the request succeeds or fails."
