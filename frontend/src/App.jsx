import { Routes, Route, Navigate } from 'react-router-dom'
import Navbar from './components/Navbar'
import ProtectedRoute from './components/ProtectedRoute'
import Login from './pages/Login'
import Signup from './pages/Signup'
import Dashboard from './pages/Dashboard'
import Assets from './pages/Assets'
import AssetForm from './pages/AssetForm'
import AssetDetail from './pages/AssetDetail'
import PublicAsset from './pages/PublicAsset'
import Issues from './pages/Issues'
import IssueDetail from './pages/IssueDetail'
import Chat from './pages/Chat'
import NotFound from './pages/NotFound'
import { useAuth } from './context/AuthContext'

function AppShell({ children }) {
  return (
    <>
      <Navbar />
      {children}
    </>
  )
}

export default function App() {
  const { isAuthenticated } = useAuth()

  return (
    <Routes>
      {/* Public — no login required, this is what the QR code links to */}
      <Route path="/asset/:code" element={<PublicAsset />} />

      <Route path="/login" element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <Login />} />
      <Route path="/signup" element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <Signup />} />

      {/* Internal — every route below requires an active session */}
      <Route path="/dashboard" element={<ProtectedRoute><AppShell><Dashboard /></AppShell></ProtectedRoute>} />
      <Route path="/assets" element={<ProtectedRoute><AppShell><Assets /></AppShell></ProtectedRoute>} />
      <Route path="/assets/new" element={<ProtectedRoute roles={['admin']}><AppShell><AssetForm /></AppShell></ProtectedRoute>} />
      <Route path="/assets/:id/edit" element={<ProtectedRoute roles={['admin']}><AppShell><AssetForm /></AppShell></ProtectedRoute>} />
      <Route path="/assets/:id" element={<ProtectedRoute><AppShell><AssetDetail /></AppShell></ProtectedRoute>} />
      <Route path="/issues" element={<ProtectedRoute><AppShell><Issues /></AppShell></ProtectedRoute>} />
      <Route path="/issues/:id" element={<ProtectedRoute><AppShell><IssueDetail /></AppShell></ProtectedRoute>} />
      <Route path="/chat" element={<ProtectedRoute><AppShell><Chat /></AppShell></ProtectedRoute>} />

      <Route path="/" element={<Navigate to={isAuthenticated ? '/dashboard' : '/login'} replace />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  )
}
