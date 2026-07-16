// Shared enum-like constants (SQLite has no native enum type, so these
// are validated in application code instead of at the DB layer, same
// values as the original Mongoose schemas).

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

export const USER_ROLES = ['admin', 'technician']

export const MESSAGE_STATUSES = ['sent', 'delivered', 'seen']
