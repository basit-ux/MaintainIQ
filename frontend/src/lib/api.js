// Thin fetch wrapper for talking to the MaintainIQ backend.
// Centralizes base URL, JWT header injection, JSON/FormData handling, and
// error shape normalization so every lib file gets the same
// { ok, ...data } | { ok: false, error } contract the UI already expects.

export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

function getToken() {
  try {
    return localStorage.getItem('maintainiq:token')
  } catch {
    return null
  }
}

export function setToken(token) {
  try {
    if (token) localStorage.setItem('maintainiq:token', token)
    else localStorage.removeItem('maintainiq:token')
  } catch {
    /* ignore */
  }
}

export function getStoredToken() {
  return getToken()
}

/**
 * Core request helper.
 * - `body` as a plain object -> sent as JSON.
 * - `body` as a FormData instance -> sent as multipart (for file uploads).
 * Always resolves (never throws) with a { ok, ...json } shape so call
 * sites can keep using `if (!result.ok) ...` the same way the original
 * localStorage-backed lib did.
 */
export async function apiRequest(path, { method = 'GET', body, headers = {}, isForm = false } = {}) {
  const token = getToken()
  const finalHeaders = { ...headers }
  if (token) finalHeaders.Authorization = `Bearer ${token}`

  let finalBody = body
  if (body && !isForm && !(body instanceof FormData)) {
    finalHeaders['Content-Type'] = 'application/json'
    finalBody = JSON.stringify(body)
  }
  if (body instanceof FormData) {
    finalBody = body
    // Let the browser set the multipart boundary itself.
  }

  try {
    const res = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers: finalHeaders,
      body: method === 'GET' ? undefined : finalBody,
    })

    let json
    try {
      json = await res.json()
    } catch {
      json = {}
    }

    if (!res.ok) {
      return { ok: false, error: json.error || `Request failed (${res.status})` }
    }
    return { ok: true, ...json }
  } catch (err) {
    return { ok: false, error: 'Network error — could not reach the server. Is the backend running?' }
  }
}

export function buildFormData(fields = {}, fileField, file) {
  const fd = new FormData()
  Object.entries(fields).forEach(([key, value]) => {
    if (value === undefined || value === null) return
    if (typeof value === 'object') {
      fd.append(key, JSON.stringify(value))
    } else {
      fd.append(key, value)
    }
  })
  if (file && fileField) fd.append(fileField, file)
  return fd
}
