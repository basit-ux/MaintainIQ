# MaintainIQ — AI-Powered QR Maintenance & Asset History Platform

SMIT Final Hackathon submission — Batch 17.

Scan an asset's QR code → report an issue → AI triages it → admin assigns a
technician → technician resolves it with a maintenance record → the asset's
permanent history is updated automatically.

## Tech stack

- React 18 + Vite
- React Router v6 (HashRouter — works on any static host, no server rewrites needed)
- Tailwind CSS
- `qrcode.react` for QR generation
- `lucide-react` for icons
- **All data lives in the browser's `localStorage`** — assets, issues,
  history, and user accounts. No backend/database is required to run this.

## Install & run

```bash
npm install
npm run dev
```

Then open the printed local URL (usually `http://localhost:5173`).

To build for deployment:

```bash
npm run build
npm run preview
```

## Dependencies to install (already listed in package.json — just run `npm install`)

- react, react-dom
- react-router-dom
- qrcode.react
- lucide-react
- vite, @vitejs/plugin-react (dev)
- tailwindcss, postcss, autoprefixer (dev)

## Demo credentials

| Role       | Email                    | Password    |
|------------|---------------------------|-------------|
| Admin      | admin@maintainiq.app      | Admin@123   |
| Technician | tech@maintainiq.app       | Tech@123    |

You can also sign up a brand-new account from `/signup` — accounts are
stored in `localStorage` under the `maintainiq:users` key.

## How authentication works (localStorage-based)

- There is no backend auth server. `src/lib/auth.js` stores user records
  (name, email, password, role) as a JSON array in `localStorage`.
- Logging in checks the entered email + password against that array. A
  wrong password or unknown email is rejected — **there is no bypass**.
- The active session is stored separately (`maintainiq:session`).
- `AuthContext` reads that session **synchronously** on load, before any
  route renders. `ProtectedRoute` checks it on every render, so typing an
  internal URL directly (e.g. `/dashboard`, `/assets`) without a valid
  session immediately redirects to `/login` — it is not just a hidden button.
- The only route that intentionally skips this check is `/asset/:code` —
  the public, QR-accessible asset page, exactly as the brief requires.

## Project structure

```
src/
  lib/
    storage.js      -> generic localStorage read/write helpers
    auth.js          -> signup/login/logout/session logic
    data.js          -> assets, issues, history CRUD + business rules
    aiTriage.js       -> AI Issue Triage engine
    helpers.js        -> formatting + badge color helpers
  context/
    AuthContext.jsx   -> global auth state
  components/
    Navbar, ProtectedRoute, Badge, QRBlock, HistoryTimeline
  pages/
    Login, Signup, Dashboard, Assets, AssetForm, AssetDetail,
    PublicAsset, Issues, IssueDetail, NotFound
```

## AI Issue Triage

`src/lib/aiTriage.js` implements a deterministic, keyword-based classifier
that returns the exact structured shape a real LLM call would (title,
category, priority, possible causes, initial checks, recurring-issue
warning, safety note). It also simulates network latency and can fail on
very short input, so the UI demonstrates loading, error, and retry states.

**This satisfies the hackathon brief's explicit allowance**: "A rule-based
issue classifier is acceptable only when the trainer has not covered secure
AI API integration." If you want to swap in a real GenAI call later:

1. Stand up a tiny backend route (Node/Express, or a serverless function)
   that holds your API key server-side.
2. POST `{ complaint, assetContext }` to it from `runAiTriageAsync`.
3. Never call an AI API with a key directly from frontend code — that
   exposes the key to anyone who opens dev tools.

## Business rules implemented

- Unique asset codes (duplicates rejected).
- Asset status auto-syncs with issue status per the brief's event table
  (Issue Reported → Under Inspection → Under Maintenance → Operational).
- Issue status only moves along allowed transitions (`canTransitionIssue`
  in `data.js`) — you cannot jump straight from "Reported" to "Resolved".
- A closed issue cannot be edited until reopened.
- An issue cannot be resolved without a maintenance note.
- Maintenance cost cannot be negative.
- Retired assets reject new issues and are clearly labeled.
- Every meaningful action writes an entry to the asset's permanent history.

## Known simplifications (documented, not hidden)

- Passwords are stored in plaintext in `localStorage` for demo purposes
  only — this is **not** how a production auth system should work, and is
  acceptable only because there is no real backend in this track's scope.
- Evidence upload is a text note field, not real file/image upload
  (no cloud storage configured for the demo).
- "AI Issue Triage" is a rule-based simulator, not a live model call —
  see the section above for how to upgrade it.

## Reset demo data

Call `resetDemoData()` from `src/lib/data.js` (e.g. wire it to a button) to
wipe and reseed assets/issues/history back to the initial demo state.
