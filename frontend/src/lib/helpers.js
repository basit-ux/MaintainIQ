export function formatDate(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

export function formatDateTime(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export const ASSET_STATUS_STYLES = {
  Operational: 'bg-ok/15 text-ok border-ok/30',
  'Issue Reported': 'bg-warn/15 text-warn border-warn/30',
  'Under Inspection': 'bg-info/15 text-info border-info/30',
  'Under Maintenance': 'bg-amber/15 text-amber border-amber/30',
  'Out of Service': 'bg-danger/15 text-danger border-danger/30',
  Retired: 'bg-steel-500/40 text-steel-200 border-steel-400/30',
}

export const ISSUE_STATUS_STYLES = {
  Reported: 'bg-info/15 text-info border-info/30',
  Assigned: 'bg-amber/15 text-amber border-amber/30',
  'Inspection Started': 'bg-info/15 text-info border-info/30',
  'Maintenance In Progress': 'bg-amber/15 text-amber border-amber/30',
  'Waiting for Parts': 'bg-warn/15 text-warn border-warn/30',
  Resolved: 'bg-ok/15 text-ok border-ok/30',
  Closed: 'bg-steel-500/40 text-steel-200 border-steel-400/30',
  Reopened: 'bg-danger/15 text-danger border-danger/30',
}

export const PRIORITY_STYLES = {
  Low: 'bg-steel-500/40 text-steel-200 border-steel-400/30',
  Medium: 'bg-info/15 text-info border-info/30',
  High: 'bg-amber/15 text-amber border-amber/30',
  Critical: 'bg-danger/20 text-danger border-danger/40',
}

export function publicAssetUrl(code) {
  const base = window.location.origin + window.location.pathname
  return `${base}#/asset/${encodeURIComponent(code)}`
}
