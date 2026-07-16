export function validateIssueInput({ assetId, title, description }) {
  const errors = []
  if (!assetId) errors.push('Asset is required.')
  if (!title || !title.trim()) errors.push('Issue title is required.')
  if (!description || !description.trim()) errors.push('Issue description is required.')
  return errors
}

export function validateMaintenanceExtra(extra = {}) {
  const errors = []
  if (extra.cost !== undefined && Number(extra.cost) < 0) {
    errors.push('Maintenance cost cannot be negative.')
  }
  return errors
}
