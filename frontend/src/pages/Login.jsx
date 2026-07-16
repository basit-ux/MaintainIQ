import { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { ScanLine, AlertCircle } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [form, setForm] = useState({ email: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const redirectTo = location.state?.from && location.state.from !== '/login' ? location.state.from : '/dashboard'

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    const result = await login(form)
    setLoading(false)
    if (!result.ok) {
      setError(result.error)
      return
    }
    navigate(redirectTo, { replace: true })
  }

  return (
    <div className="min-h-screen bg-grid flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 rounded-lg bg-amber/15 border border-amber/30 flex items-center justify-center mb-3">
            <ScanLine size={24} className="text-amber" />
          </div>
          <h1 className="font-display text-2xl font-semibold text-steel-50">Maintain<span className="text-amber">IQ</span></h1>
          <p className="text-steel-300 text-sm mt-1">Sign in to your operations account</p>
        </div>

        <form onSubmit={handleSubmit} className="tag-corner bg-steel-800 border border-steel-500 rounded-lg p-6 space-y-4">
          {error && (
            <div className="flex items-start gap-2 text-sm bg-danger/10 border border-danger/30 text-danger rounded-md px-3 py-2">
              <AlertCircle size={16} className="shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-mono uppercase tracking-wide text-steel-300 mb-1.5">Email</label>
            <input
              type="email"
              required
              autoFocus
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="w-full bg-steel-700 border border-steel-500 rounded-md px-3 py-2.5 text-sm text-steel-50 placeholder:text-steel-400 focus:border-amber outline-none transition-colors"
              placeholder="you@organization.com"
            />
          </div>

          <div>
            <label className="block text-xs font-mono uppercase tracking-wide text-steel-300 mb-1.5">Password</label>
            <input
              type="password"
              required
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              className="w-full bg-steel-700 border border-steel-500 rounded-md px-3 py-2.5 text-sm text-steel-50 placeholder:text-steel-400 focus:border-amber outline-none transition-colors"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-md bg-amber text-steel-950 font-semibold text-sm hover:bg-amber-light disabled:opacity-60 transition-colors"
          >
            {loading ? 'Signing in…' : 'Sign in'}
          </button>

          <p className="text-center text-xs text-steel-300">
            No account? <Link to="/signup" className="text-amber hover:underline">Create one</Link>
          </p>
        </form>

        <div className="mt-5 text-xs text-steel-400 border border-steel-500/60 rounded-md p-3 font-mono leading-relaxed">
          Demo credentials — Admin: admin@maintainiq.app / Admin@123<br />
          Technician: tech@maintainiq.app / Tech@123
        </div>
      </div>
    </div>
  )
}
