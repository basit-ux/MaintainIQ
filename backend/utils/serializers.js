// Prisma rows are plain flat objects. The frontend (via lib/normalize.js)
// already tolerates both `_id`/`id` and either a plain id string or a
// populated object for relation fields, so these helpers just:
//   1. Strip sensitive fields (password).
//   2. Parse the JSON-encoded `aiSuggested` / `maintenance` columns back
//      into objects so the API response shape matches the old Mongoose
//      embedded-subdocument shape exactly.

export function toSafeUser(user) {
  if (!user) return user
  const { password, ...safe } = user
  return safe
}

function safeParseJSON(value) {
  if (value === null || value === undefined) return null
  if (typeof value !== 'string') return value
  try {
    return JSON.parse(value)
  } catch {
    return null
  }
}

export function serializeIssue(issue) {
  if (!issue) return issue
  const out = {
    ...issue,
    aiSuggested: safeParseJSON(issue.aiSuggested),
    maintenance: safeParseJSON(issue.maintenance),
  }
  if (out.assignedTechnician) out.assignedTechnician = toSafeUser(out.assignedTechnician)
  if (out.asset && out.asset.assignedTechnician) {
    out.asset = { ...out.asset, assignedTechnician: toSafeUser(out.asset.assignedTechnician) }
  }
  return out
}

export function serializeAsset(asset) {
  if (!asset) return asset
  const out = { ...asset }
  if (out.assignedTechnician) out.assignedTechnician = toSafeUser(out.assignedTechnician)
  return out
}

export function serializeMessage(message) {
  if (!message) return message
  const out = { ...message }
  if (out.sender && typeof out.sender === 'object') out.sender = toSafeUser(out.sender)
  if (out.receiver && typeof out.receiver === 'object') out.receiver = toSafeUser(out.receiver)
  return out
}
