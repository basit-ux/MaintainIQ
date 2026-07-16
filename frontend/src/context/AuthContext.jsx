import { createContext, useContext, useState, useCallback, useEffect } from 'react'
import * as authLib from '../lib/auth'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  // Initialized synchronously from the cached session so a hard refresh or
  // a directly-typed URL never renders a protected page before the check
  // runs. The cache is written on login/signup and revalidated against the
  // server in the background below.
  const [user, setUser] = useState(() => authLib.getCurrentUser())

  useEffect(() => {
    // Background revalidation: if the JWT is expired/invalid, this clears
    // the session so ProtectedRoute redirects to /login on next render.
    authLib.refreshCurrentUser().then((fresh) => {
      setUser(fresh)
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const login = useCallback(async (creds) => {
    const result = await authLib.login(creds)
    if (result.ok) setUser(result.user)
    return result
  }, [])

  const signup = useCallback(async (data) => {
    const result = await authLib.signup(data)
    if (result.ok) setUser(result.user)
    return result
  }, [])

  const logout = useCallback(async () => {
    await authLib.logout()
    setUser(null)
  }, [])

  return (
    <AuthContext.Provider value={{ user, login, signup, logout, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
