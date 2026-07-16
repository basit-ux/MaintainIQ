# MaintainIQ — Asset & Issue Maintenance Management

MaintainIQ is a full-stack MERN-style application for tracking physical assets,
reported issues, AI-assisted issue triage, QR-code based reporting, a
maintenance workflow, and real-time admin ↔ technician chat.

**Database: SQLite via Prisma.** No MongoDB, no MongoDB Atlas, no Docker, and
no separate database server to install — the database is a single local file
(`backend/prisma/dev.db`) created automatically when you run the migration
command below.

## Stack

- **Frontend:** React + Vite + Tailwind CSS
- **Backend:** Node.js + Express + Socket.IO
- **Database:** SQLite, accessed through **Prisma ORM**
- **Auth:** JWT (JSON Web Tokens)
- **Images:** Cloudinary (optional — gracefully skipped if not configured)
- **AI Triage:** Gemini or OpenAI (optional — falls back to a built-in
  rule-based classifier if no API key is configured, so the feature always works)

## Project layout

```
MaintainIQ/
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma        # Prisma data model (User, Asset, Issue, History, Message)
│   │   └── migrations/          # SQL migrations (auto-applied by `prisma migrate dev`)
│   ├── config/                  # Prisma client singleton, DB connection check, Cloudinary
│   ├── controllers/             # Route handlers (rewritten for Prisma)
│   ├── middleware/               # JWT auth, role guard, error handler
│   ├── routes/                   # Express routers
│   ├── services/                 # AI triage, QR generation, Cloudinary upload
│   ├── socket/                   # Socket.IO real-time chat server
│   ├── utils/                    # Constants, serializers, token/id helpers, seed script
│   ├── validation/               # Input validation helpers
│   ├── app.js / server.js
│   └── .env.example
└── frontend/
    ├── src/                      # React app (unchanged — backend-agnostic)
    └── .env.example
```

## Quick start (Windows, macOS, or Linux)

### 1. Backend

```bash
cd backend
npm install
npx prisma migrate dev
npm run dev
```

- `npm install` installs dependencies (including Prisma + the SQLite client).
- `npx prisma migrate dev` creates `backend/prisma/dev.db` and applies the
  included migration (or generates a fresh one if you ever edit
  `schema.prisma`). It will also prompt you to name a migration only if the
  schema has changed since the last one — for a first run it just applies
  the existing migration and generates the Prisma Client.
- `npm run dev` starts the API on `http://localhost:5000` (via nodemon).

To load demo data (an admin, a technician, and a handful of sample assets
with generated QR codes):

```bash
npm run seed
```

Demo logins after seeding:

| Role       | Email                     | Password    |
|------------|---------------------------|-------------|
| Admin      | admin@maintainiq.app      | Admin@123   |
| Technician | tech@maintainiq.app       | Tech@123    |

### 2. Frontend

In a second terminal:

```bash
cd frontend
npm install
npm run dev
```

The app runs on `http://localhost:5173` and talks to the API at
`http://localhost:5000/api` (configurable via `frontend/.env`).

## Environment variables

Copy `backend/.env.example` to `backend/.env` (a working `.env` with local
defaults is already included so the app runs out of the box). Key variables:

- `DATABASE_URL="file:./dev.db"` — the SQLite database file. No install or
  separate server required.
- `JWT_SECRET` — secret used to sign auth tokens.
- `CLOUDINARY_*` — optional; without real credentials, image upload calls are
  skipped gracefully (assets/issues/chat still work, just without photos).
- `AI_PROVIDER`, `GEMINI_API_KEY` / `OPENAI_API_KEY` — optional; without a
  real key, AI triage automatically falls back to a deterministic rule-based
  classifier.

Copy `frontend/.env.example` to `frontend/.env` if you need to point the
frontend at a different API URL.

## What changed in this migration (MongoDB → SQLite/Prisma)

- Removed `mongoose` and `express-mongo-sanitize` entirely.
- Removed the `models/` directory (Mongoose schemas) and replaced it with
  `prisma/schema.prisma`, defining `User`, `Asset`, `Issue`, `History`, and
  `Message` models with proper relations, unique constraints, and indexes.
- Every controller, middleware function, service, and utility that touched
  the database was rewritten to use the Prisma Client instead of Mongoose
  (`prisma.model.findMany/findUnique/create/update/delete/count`, etc.).
- Mongo `ObjectId`s are replaced by Prisma's `cuid()`-generated string IDs.
  The frontend already normalized `_id`/`id` interchangeably
  (`lib/normalize.js`), so **no frontend code changes were required.**
- Mongoose's embedded sub-documents (`aiSuggested`, `maintenance` on `Issue`)
  are stored as JSON-encoded text columns in SQLite and transparently
  parsed/serialized back into the same object shape the frontend expects
  (`utils/serializers.js`).
- Mongo's `express-mongo-sanitize` middleware (which only makes sense for
  MongoDB) was removed; Prisma's parameterized queries are inherently safe
  from SQL injection.
- Search (`$regex` in Mongo) was replaced with SQLite `LIKE` (case-insensitive
  by default for ASCII), preserving the same search-as-you-type behavior.
- Error handling was updated to translate Prisma error codes (`P2002` unique
  constraint, `P2025` not found, `P2003` foreign key) into the same HTTP
  status codes/messages the app used before.

Every existing feature — authentication, admin/technician roles, assets,
issues, QR generation, AI triage, real-time chat, dashboard stats, and
history logging — was preserved and re-tested against the new database.

## Testing performed

The full request lifecycle was exercised end-to-end against a real SQLite
database, covering: signup/login/logout for both roles, duplicate-email and
duplicate-asset-code rejection, asset CRUD + search + QR generation, public
QR-code asset lookup, AI triage (both a full response and the too-short
input rejection), issue creation, technician assignment, the full status
state machine (Reported → Assigned → Inspection Started → Maintenance In
Progress → Resolved, including the "no maintenance note" rejection), asset
status syncing on each transition, dashboard stat aggregation, asset history
logging, chat contacts/unread counts/last-message previews, message sending
and seen-receipts, technician-to-technician chat blocking, cascading deletes
(deleting an asset removes its issues and history), and role-based route
protection (403 on technician attempting an admin-only action).

## Notes

- Prisma Studio (a visual DB browser) is available via `npm run prisma:studio`
  in the backend folder.
- The SQLite file lives at `backend/prisma/dev.db` and is git-ignored; delete
  it and re-run `npx prisma migrate dev` (+ `npm run seed`) any time you want
  a clean database.
