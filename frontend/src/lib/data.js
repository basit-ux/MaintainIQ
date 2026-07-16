// Backend-backed replacement for the original localStorage mock data layer.
// Every exported function keeps the same name and the same { ok, ...} /
// plain-array return shape as the original, just made async underneath.
// Call sites in pages only need `await` added — no other logic changes.

import { apiRequest, buildFormData } from './api'
import { normalizeAsset, normalizeIssue, normalizeHistory } from './normalize'

export const ASSET_STATUSES = [
  'Operational',
  'Issue Reported',
  'Under Inspection',
  'Under Maintenance',
  'Out of Service',
  'Retired',
]

export const ISSUE_STATUSES = [
  'Reported',
  'Assigned',
  'Inspection Started',
  'Maintenance In Progress',
  'Waiting for Parts',
  'Resolved',
  'Closed',
  'Reopened',
]

export const PRIORITIES = ['Low', 'Medium', 'High', 'Critical']

const ISSUE_TRANSITIONS = {
  Reported: ['Assigned'],
  Assigned: ['Inspection Started'],
  'Inspection Started': ['Maintenance In Progress', 'Waiting for Parts'],
  'Waiting for Parts': ['Maintenance In Progress'],
  'Maintenance In Progress': ['Resolved', 'Waiting for Parts'],
  Resolved: ['Closed', 'Reopened'],
  Closed: ['Reopened'],
  Reopened: ['Assigned', 'Inspection Started'],
}

export function canTransitionIssue(from, to) {
  return (ISSUE_TRANSITIONS[from] || []).includes(to)
}

// ---------- Assets ----------

export async function getAssets(filters = {}) {
  const params = new URLSearchParams()
  Object.entries(filters).forEach(([k, v]) => {
    if (v && v !== 'All') params.set(k, v)
  })
  const qs = params.toString()
  const result = await apiRequest(`/assets${qs ? `?${qs}` : ''}`)
  if (!result.ok) return []
  return (result.assets || []).map(normalizeAsset)
}

export async function getAssetById(id) {
  const result = await apiRequest(`/assets/${id}`)
  if (!result.ok) return null
  return normalizeAsset(result.asset)
}

export async function getAssetByCode(code) {
  const result = await apiRequest(`/assets/code/${encodeURIComponent((code || '').trim().toUpperCase())}`)
  if (!result.ok) return null
  return normalizeAsset(result.asset)
}

export async function createAsset(data, actor, imageFile) {
  const fd = buildFormData(data, 'image', imageFile)
  const result = await apiRequest('/assets', { method: 'POST', body: fd, isForm: true })
  if (!result.ok) return { ok: false, error: result.error }
  return { ok: true, asset: normalizeAsset(result.asset) }
}

export async function updateAsset(id, patch, actor, imageFile) {
  const fd = buildFormData(patch, 'image', imageFile)
  const result = await apiRequest(`/assets/${id}`, { method: 'PUT', body: fd, isForm: true })
  if (!result.ok) return { ok: false, error: result.error }
  return { ok: true, asset: normalizeAsset(result.asset) }
}

export async function setAssetStatus(id, status, actor) {
  return updateAsset(id, { status }, actor)
}

export async function deleteAsset(id) {
  const result = await apiRequest(`/assets/${id}`, { method: 'DELETE' })
  return result
}

// ---------- Issues ----------

export async function getIssues(filters = {}) {
  const params = new URLSearchParams()
  Object.entries(filters).forEach(([k, v]) => {
    if (v && v !== 'All') params.set(k, v)
  })
  const qs = params.toString()
  const result = await apiRequest(`/issues${qs ? `?${qs}` : ''}`)
  if (!result.ok) return []
  return (result.issues || []).map(normalizeIssue)
}

export async function getIssueById(id) {
  const result = await apiRequest(`/issues/${id}`)
  if (!result.ok) return null
  return normalizeIssue(result.issue)
}

export async function getIssuesForAsset(assetId) {
  const result = await apiRequest(`/issues/asset/${assetId}`)
  if (!result.ok) return []
  return (result.issues || []).map(normalizeIssue)
}

export async function createIssue(data, photoFile) {
  const fd = buildFormData(data, 'photo', photoFile)
  const result = await apiRequest('/issues', { method: 'POST', body: fd, isForm: true })
  if (!result.ok) return { ok: false, error: result.error }
  return { ok: true, issue: normalizeIssue(result.issue) }
}

export async function assignIssue(issueId, technicianId, technicianName, actor) {
  const result = await apiRequest(`/issues/${issueId}/assign`, {
    method: 'PUT',
    body: { technicianId },
  })
  if (!result.ok) return { ok: false, error: result.error }
  return { ok: true, issue: normalizeIssue(result.issue) }
}

export async function updateIssueStatus(issueId, newStatus, actor, extra = {}, evidencePhotoFile) {
  const fd = buildFormData({ status: newStatus, ...extra }, 'evidencePhoto', evidencePhotoFile)
  const result = await apiRequest(`/issues/${issueId}/status`, { method: 'PUT', body: fd, isForm: true })
  if (!result.ok) return { ok: false, error: result.error }
  return { ok: true, issue: normalizeIssue(result.issue) }
}

// ---------- History ----------

export async function getHistory() {
  const result = await apiRequest('/history')
  if (!result.ok) return []
  return (result.history || []).map(normalizeHistory)
}

export async function getHistoryForAsset(assetId) {
  const result = await apiRequest(`/history/asset/${assetId}`)
  if (!result.ok) return []
  return (result.history || []).map(normalizeHistory)
}

// ---------- Dashboard ----------

export async function getDashboardStats() {
  const result = await apiRequest('/assets/dashboard/stats')
  if (!result.ok) {
    return { totalAssets: 0, operational: 0, outOfService: 0, openIssues: 0, criticalOpen: 0, resolvedThisMonth: 0 }
  }
  return result.stats
}
