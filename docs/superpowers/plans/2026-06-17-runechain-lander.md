# RUNECHAIN Lander Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Vercel-ready RUNECHAIN landing page with a mailing-list signup that records and exports CSV data while preserving the existing playable game.

**Architecture:** Keep the no-build architecture. Add a static lander at `/`, move the existing game entry to `/play`, and extend the zero-dependency Node server with a small CSV-backed mailing-list endpoint. Avoid public email leakage by gating CSV download behind an environment token while still writing a normal CSV file on disk.

**Tech Stack:** Plain HTML/CSS/JS, Node `http`, `fs`, `path`, built-in test script, Vercel CLI.

---

### Task 1: Route and Signup Verification

**Files:**
- Create: `scripts/verify_landing_signup.js`
- Modify: `package.json`

- [x] **Step 1: Write a failing verification script**

Create `scripts/verify_landing_signup.js` that starts `server.js` on an ephemeral port with temporary `ledgerFile`, `accountsFile`, and `mailingListFile`, then checks:
- `GET /` returns `landing.html` content with `id="mailing-list"`.
- `GET /play` returns the existing game canvas.
- `POST /api/waitlist` accepts a valid email and appends one CSV data row.
- invalid signup input returns HTTP 400.
- `GET /api/waitlist.csv` requires `WAITLIST_EXPORT_TOKEN`.

- [x] **Step 2: Run the new script to verify it fails**

Run: `node scripts/verify_landing_signup.js`
Expected before implementation: FAIL because `/` still serves the game and `/api/waitlist` is missing.

- [x] **Step 3: Add it to `npm test` after the existing verifiers**

Modify `package.json` so `npm test` includes `node scripts/verify_landing_signup.js`.

### Task 2: Static Lander

**Files:**
- Create: `landing.html`
- Create: `assets/brand/runechain-lander.png`

- [ ] **Step 1: Copy the supplied poster into repo assets**

Copy `/var/folders/rp/t7qtw9751ngf5k8cs2t6nx0h0000gn/T/codex-clipboard-a679202a-e281-48b0-91ae-5ba8062ceb90.png` to `assets/brand/runechain-lander.png`.

- [ ] **Step 2: Build the landing page**

Create a production static page matching the supplied poster direction: dark parish, gold typography, concise game premise, primary `Enter Gracefall` CTA to `/play`, mailing-list form, and restrained proof points from the design bible.

- [ ] **Step 3: Keep signup behavior progressive**

The form should submit with `fetch('/api/waitlist')`, show success/error states, and remain usable if JavaScript fails through a normal POST fallback.

### Task 3: Server Routes and CSV Export

**Files:**
- Modify: `server.js`

- [ ] **Step 1: Route `/` and `/play` explicitly**

Serve `landing.html` for `/` and `index.html` for `/play`, while preserving current static file serving and `/healthz`.

- [ ] **Step 2: Add signup endpoint**

Implement `POST /api/waitlist` for `application/json` and form-encoded bodies. Validate email length/shape, normalize lowercase email, limit optional display name and note fields, append one CSV row with ISO timestamp, email, source path, name, note, and IP hash or plain IP only if intentionally chosen. Use no new dependencies.

- [ ] **Step 3: Add token-gated CSV export**

Implement `GET /api/waitlist.csv?token=...`, requiring `WAITLIST_EXPORT_TOKEN`. If unset or mismatched, return 404/403. If the CSV does not exist yet, return the header-only CSV.

### Task 4: Verification and Preview

**Files:**
- Potentially create: `vercel.json` only if Vercel preview requires explicit routing.

- [ ] **Step 1: Run focused verification**

Run: `node scripts/verify_landing_signup.js`
Expected: PASS.

- [ ] **Step 2: Run full repo tests**

Run: `npm test`
Expected: PASS.

- [ ] **Step 3: Run local browser smoke**

Start the server on a free port, verify `/`, `/play`, and a signup submission in a browser or HTTP smoke. Capture screenshots for desktop/mobile before final handoff.

- [ ] **Step 4: Deploy preview**

Use Vercel CLI from repo root to create a preview deployment. Inspect the preview URL and, if needed, add minimal Vercel config.

- [ ] **Step 5: Production and domain**

After preview is proven, deploy production. Buy/attach `runechaingame.com` only after explicit confirmation for the `$11.25` purchase.
