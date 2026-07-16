// Backend-backed replacement for the original localStorage mock auth layer.
// Keeps the exact same exported function names and { ok, user, error }
// return shape so AuthContext and the pages that call it need only add
// `await` at the call sites — no logic or UI rewrite required.

import { apiRequest, setToken, getStoredToken } from './api'
import { normalizeUser } from './normalize'

const SESSION_KEY = 'maintainiq:user'

function readCachedUser() {
  try {
    const raw = localStorage.getItem(SESSION_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

function writeCachedUser(user) {
  try {
    if (user) localStorage.setItem(SESSION_KEY, JSON.stringify(user))
    else localStorage.removeItem(SESSION_KEY)
  } catch {
    /* ignore */
  }
}

// Synchronous — reads the cached session so a hard refresh or a directly
// typed URL never renders a protected page before a network round trip
// finishes. The cache is populated on login/signup and kept fresh by
// AuthContext's background /auth/me revalidation.
export function getCurrentUser() {
  if (!getStoredToken()) return null
  return readCachedUser()
}

export async function signup({ name, email, password, role }) {
  const result = await apiRequest('/auth/signup', {
    method: 'POST',
    body: { name, email, password, role },
  })
  if (!result.ok) return { ok: false, error: result.error }

  const user = normalizeUser(result.user)
  setToken(result.token)
  writeCachedUser(user)
  return { ok: true, user }
}

export async function login({ email, password }) {
  const result = await apiRequest('/auth/login', {
    method: 'POST',
    body: { email, password },
  })
  if (!result.ok) return { ok: false, error: result.error }

  const user = normalizeUser(result.user)
  setToken(result.token)
  writeCachedUser(user)
  return { ok: true, user }
}

export async function logout() {
  await apiRequest('/auth/logout', { method: 'POST' })
  setToken(null)
  writeCachedUser(null)
}

// Revalidates the cached session against the server. Called in the
// background by AuthContext; if the token is invalid/expired this clears
// the session so the next protected-route check redirects to /login.
export async function refreshCurrentUser() {
  if (!getStoredToken()) return null
  const result = await apiRequest('/auth/me')
  if (!result.ok) {
    setToken(null)
    writeCachedUser(null)
    return null
  }
  const user = normalizeUser(result.user)
  writeCachedUser(user)
  return user
}

export async function getTechnicians() {
  const result = await apiRequest('/auth/technicians')
  if (!result.ok) return []
  return (result.technicians || []).map(normalizeUser)
}
