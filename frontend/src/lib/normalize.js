// Normalizes MongoDB documents (which use `_id`) into the shape the
// existing frontend components already expect (`id`), and flattens any
// populated references back down to plain id strings so equality checks
// like `issue.assignedTechnicianId === user.id` keep working unchanged.

function idOf(value) {
  if (value === null || value === undefined) return value
  if (typeof value === 'object') return value._id || value.id || null
  return value
}

export function normalizeUser(u) {
  if (!u) return u
  return { ...u, id: u._id || u.id, assignedAdmin: idOf(u.assignedAdmin) }
}

export function normalizeAsset(a) {
  if (!a) return a
  return {
    ...a,
    id: a._id || a.id,
    assignedTechnician: idOf(a.assignedTechnician),
  }
}

export function normalizeIssue(i) {
  if (!i) return i
  return {
    ...i,
    id: i._id || i.id,
    assetId: idOf(i.assetId),
    assignedTechnicianId: idOf(i.assignedTechnicianId),
  }
}

export function normalizeHistory(h) {
  if (!h) return h
  return {
    ...h,
    id: h._id || h.id,
    assetId: idOf(h.assetId),
    relatedIssueId: idOf(h.relatedIssueId),
  }
}

export function normalizeMessage(m) {
  if (!m) return m
  return {
    ...m,
    id: m._id || m.id,
    sender: idOf(m.sender),
    receiver: idOf(m.receiver),
    senderDetails: typeof m.sender === 'object' ? normalizeUser(m.sender) : undefined,
    receiverDetails: typeof m.receiver === 'object' ? normalizeUser(m.receiver) : undefined,
  }
}
