import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

// Wrap any internal page with this. If there is no active session in
// localStorage, the user is bounced to /login — this fires on every
// render, including when someone types a protected URL directly into
// the address bar, because AuthContext initializes synchronously from
// localStorage before this component ever mounts.
export default function ProtectedRoute({ children, roles }) {
  const { user, isAuthenticated } = useAuth()
  const location = useLocation()

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }

  if (roles && roles.length && !roles.includes(user.role)) {
    return <Navigate to="/dashboard" replace />
  }

  return children
}
