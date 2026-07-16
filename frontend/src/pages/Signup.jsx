import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ScanLine, AlertCircle } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

export default function Signup() {
  const { signup } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'admin' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    const result = await signup(form)
    setLoading(false)
    if (!result.ok) {
      setError(result.error)
      return
    }
    navigate('/dashboard', { replace: true })
  }

  return (
    <div className="min-h-screen bg-grid flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 rounded-lg bg-amber/15 border border-amber/30 flex items-center justify-center mb-3">
            <ScanLine size={24} className="text-amber" />
          </div>
          <h1 className="font-display text-2xl font-semibold text-steel-50">Create your account</h1>
          <p className="text-steel-300 text-sm mt-1">Join your organization's maintenance team</p>
        </div>

        <form onSubmit={handleSubmit} className="tag-corner bg-steel-800 border border-steel-500 rounded-lg p-6 space-y-4">
          {error && (
            <div className="flex items-start gap-2 text-sm bg-danger/10 border border-danger/30 text-danger rounded-md px-3 py-2">
              <AlertCircle size={16} className="shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-mono uppercase tracking-wide text-steel-300 mb-1.5">Full name</label>
            <input
              required
              autoFocus
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full bg-steel-700 border border-steel-500 rounded-md px-3 py-2.5 text-sm text-steel-50 placeholder:text-steel-400 focus:border-amber outline-none transition-colors"
              placeholder="Your full name"
            />
          </div>

          <div>
            <label className="block text-xs font-mono uppercase tracking-wide text-steel-300 mb-1.5">Email</label>
            <input
              type="email"
              required
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
              minLength={6}
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              className="w-full bg-steel-700 border border-steel-500 rounded-md px-3 py-2.5 text-sm text-steel-50 placeholder:text-steel-400 focus:border-amber outline-none transition-colors"
              placeholder="At least 6 characters"
            />
          </div>

          <div>
            <label className="block text-xs font-mono uppercase tracking-wide text-steel-300 mb-1.5">Role</label>
            <div className="grid grid-cols-2 gap-2">
              {['admin', 'technician'].map((r) => (
                <button
                  type="button"
                  key={r}
                  onClick={() => setForm({ ...form, role: r })}
                  className={`py-2.5 rounded-md text-sm font-medium border transition-colors capitalize ${
                    form.role === r ? 'bg-amber/15 border-amber text-amber' : 'border-steel-500 text-steel-200 hover:border-steel-400'
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-md bg-amber text-steel-950 font-semibold text-sm hover:bg-amber-light disabled:opacity-60 transition-colors"
          >
            {loading ? 'Creating account…' : 'Create account'}
          </button>

          <p className="text-center text-xs text-steel-300">
            Already have an account? <Link to="/login" className="text-amber hover:underline">Sign in</Link>
          </p>
        </form>
      </div>
    </div>
  )
}
