export function validateAssetInput({ code, name }) {
  const errors = []
  if (!code || !code.trim()) errors.push('Asset code is required.')
  if (!name || !name.trim()) errors.push('Asset name is required.')
  return errors
}

export function validateAssetDates({ lastServiceDate, nextServiceDate }) {
  const errors = []
  if (nextServiceDate && lastServiceDate && nextServiceDate < lastServiceDate) {
    errors.push('Next service date cannot be before the last service (maintenance completion) date.')
  }
  return errors
}
