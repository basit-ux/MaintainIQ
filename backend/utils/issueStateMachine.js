// Allowed forward transitions per business rules (ported 1:1 from the
// original frontend mock data layer so behavior does not change).
export const ISSUE_TRANSITIONS = {
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

// Maps a new issue status to the resulting asset status, per the brief's
// event table.
export const ASSET_STATUS_MAP = {
  'Inspection Started': 'Under Inspection',
  'Maintenance In Progress': 'Under Maintenance',
  Resolved: 'Operational',
  Closed: 'Operational',
}
