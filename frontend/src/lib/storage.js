// Thin wrapper around localStorage so every read/write goes through
// JSON serialization safely and always has a sane fallback.

const NAMESPACE = 'maintainiq:'

export function readStore(key, fallback) {
  try {
    const raw = localStorage.getItem(NAMESPACE + key)
    if (raw === null) return fallback
    return JSON.parse(raw)
  } catch (err) {
    console.error(`Failed to read "${key}" from storage`, err)
    return fallback
  }
}

export function writeStore(key, value) {
  try {
    localStorage.setItem(NAMESPACE + key, JSON.stringify(value))
    return true
  } catch (err) {
    console.error(`Failed to write "${key}" to storage`, err)
    return false
  }
}

export function removeStore(key) {
  localStorage.removeItem(NAMESPACE + key)
}

export function newId(prefix = '') {
  const rand = Math.random().toString(36).slice(2, 8).toUpperCase()
  const time = Date.now().toString(36).slice(-4).toUpperCase()
  return `${prefix}${prefix ? '-' : ''}${time}${rand}`
}
