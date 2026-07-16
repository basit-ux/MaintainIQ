# MaintainIQ — API Documentation

Base URL: `http://localhost:5000/api` (configurable via `CLIENT_URL`/`VITE_API_URL`)

All protected routes require `Authorization: Bearer <JWT>`.
All responses follow `{ ok: true, ... }` on success or `{ ok: false, error: "message" }` on failure.

## Auth — `/api/auth`

| Method | Path                | Access        | Description |
|--------|----------------------|---------------|-------------|
| POST   | `/signup`            | Public        | Register a new admin or technician. Body: `{ name, email, password, role }` |
| POST   | `/login`              | Public        | Log in. Body: `{ email, password }`. Returns `{ user, token }` |
| GET    | `/me`                 | Private       | Get the current logged-in user |
| POST   | `/logout`             | Private       | Marks the user offline |
| GET    | `/technicians`        | Private       | List all technicians (for assignment dropdowns) |

## Assets — `/api/assets`

| Method | Path                        | Access         | Description |
|--------|------------------------------|----------------|-------------|
| GET    | `/`                          | Private        | List assets. Query: `search`, `status`, `category`, `location` |
| GET    | `/:id`                       | Private        | Get one asset by id |
| GET    | `/code/:code`                | Public         | Get one asset by human-readable code (used by the public QR page) |
| POST   | `/`                          | Admin only     | Create asset (multipart form, optional `image` file). Auto-generates + stores a QR code |
| PUT    | `/:id`                       | Admin only     | Update asset (multipart form, optional `image` file) |
| DELETE | `/:id`                       | Admin only     | Delete asset |
| GET    | `/dashboard/stats`           | Private        | Dashboard summary stats |

## Issues — `/api/issues`

| Method | Path                    | Access         | Description |
|--------|--------------------------|----------------|-------------|
| POST   | `/ai-triage`             | Public         | Run AI triage on a complaint. Body: `{ complaint, assetId }` |
| POST   | `/`                      | Public         | Report a new issue (multipart form, optional `photo` file) |
| GET    | `/`                      | Private        | List issues. Query: `search`, `status`, `priority`, `assetId`. Technicians only see their own assigned issues |
| GET    | `/:id`                   | Private        | Get one issue |
| GET    | `/asset/:assetId`        | Private        | Get all issues for a given asset |
| PUT    | `/:id/assign`            | Admin only     | Assign a technician. Body: `{ technicianId }` |
| PUT    | `/:id/status`            | Private        | Update issue status / record maintenance (multipart form, optional `evidencePhoto` file). Body may include `status`, `maintenanceNote`, `partsUsed`, `cost`, `timeSpentHours`, `finalCondition`, `evidenceNote`, `nextServiceDate`, `markOutOfService` |

### Issue status state machine

```
Reported → Assigned → Inspection Started → Maintenance In Progress → Resolved → Closed
                                          ↘ Waiting for Parts ↗              ↘ Reopened ↗
```
Enforced identically on the backend as it was in the original frontend mock layer.

## History — `/api/history`

| Method | Path               | Access   | Description |
|--------|---------------------|----------|-------------|
| GET    | `/`                 | Private  | All history entries, newest first |
| GET    | `/asset/:assetId`   | Private  | History entries for one asset |

## Chat — `/api/chat`

| Method | Path                    | Access   | Description |
|--------|--------------------------|----------|-------------|
| GET    | `/contacts`              | Private  | Contacts this user is allowed to chat with, with unread counts + last message preview |
| GET    | `/messages/:userId`      | Private  | Full message history with another user (also marks them as seen) |
| POST   | `/messages/:userId`      | Private  | Send a message via REST (multipart, optional `image` file) — fallback to the primary Socket.IO path |

## Socket.IO events

Connect with `io(SOCKET_URL, { auth: { token: JWT } })`.

| Event (client → server) | Payload | Description |
|---|---|---|
| `message:send` | `{ receiverId, text, imageUrl }` | Send a message, acked with `{ ok, message }` |
| `typing:start` / `typing:stop` | `{ receiverId }` | Typing indicator |
| `message:seen` | `{ otherUserId }` | Marks all messages from that user as seen |
| `presence:list` | — | Callback returns array of currently-online user ids |

| Event (server → client) | Payload | Description |
|---|---|---|
| `message:receive` | message object | New incoming message |
| `message:sent-ack` | message object | Confirms a message you sent was persisted |
| `message:seen-ack` | `{ by }` | The other user has seen your messages |
| `typing:start` / `typing:stop` | `{ senderId }` | The other user is/isn't typing |
| `presence:update` | `{ userId, isOnline, lastSeen? }` | A user's online status changed |

## Error format

```json
{ "ok": false, "error": "Human-readable message" }
```

Common status codes: `400` validation, `401` auth required/invalid,
`403` forbidden by role/ownership, `404` not found, `500` server error.
