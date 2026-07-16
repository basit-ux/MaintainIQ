import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { AlertCircle, ArrowLeft } from 'lucide-react'
import { createAsset, updateAsset, getAssetById } from '../lib/data'
import { useAuth } from '../context/AuthContext'

const CATEGORIES = ['Electronics', 'HVAC', 'Plumbing', 'Electrical', 'Mechanical', 'Furniture', 'IT Equipment', 'General']
const CONDITIONS = ['Excellent', 'Good', 'Fair', 'Poor']

export default function AssetForm() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const { id } = useParams()
  const isEdit = !!id

  const [form, setForm] = useState({
    code: '', name: '', category: 'Electronics', location: '', condition: 'Good',
    lastServiceDate: '', nextServiceDate: '',
  })
  const [error, setError] = useState('')

  useEffect(() => {
    if (isEdit) {
      getAssetById(id).then((asset) => {
        if (asset) {
          setForm({
            code: asset.code, name: asset.name, category: asset.category, location: asset.location,
            condition: asset.condition, lastServiceDate: asset.lastServiceDate || '', nextServiceDate: asset.nextServiceDate || '',
          })
        }
      })
    }
  }, [id, isEdit])

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (!form.code.trim() || !form.name.trim() || !form.location.trim()) {
      setError('Asset code, name, and location are required.')
      return
    }
    if (form.nextServiceDate && form.lastServiceDate && form.nextServiceDate < form.lastServiceDate) {
      setError('Next service date cannot be before the last service date.')
      return
    }

    const result = isEdit ? await updateAsset(id, form, user) : await createAsset(form, user)
    if (!result.ok) {
      setError(result.error)
      return
    }
    navigate(`/assets/${result.asset.id}`)
  }

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
      <button onClick={() => navigate(-1)} className="flex items-center gap-1.5 text-sm text-steel-300 hover:text-steel-50 mb-4">
        <ArrowLeft size={15} /> Back
      </button>
      <p className="text-xs font-mono uppercase tracking-widest text-amber mb-1.5">{isEdit ? 'Edit Asset' : 'New Registration'}</p>
      <h1 className="font-display text-2xl font-semibold text-steel-50 mb-6">{isEdit ? 'Update asset' : 'Register a new asset'}</h1>

      <form onSubmit={handleSubmit} className="bg-steel-800 border border-steel-500 rounded-lg p-6 space-y-4">
        {error && (
          <div className="flex items-start gap-2 text-sm bg-danger/10 border border-danger/30 text-danger rounded-md px-3 py-2">
            <AlertCircle size={16} className="shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-mono uppercase tracking-wide text-steel-300 mb-1.5">Asset code *</label>
            <input
              required
              disabled={isEdit}
              value={form.code}
              onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
              placeholder="e.g. PROJ-CR07"
              className="w-full bg-steel-700 border border-steel-500 rounded-md px-3 py-2.5 text-sm font-mono text-steel-50 placeholder:text-steel-400 focus:border-amber outline-none disabled:opacity-50"
            />
          </div>
          <div>
            <label className="block text-xs font-mono uppercase tracking-wide text-steel-300 mb-1.5">Category</label>
            <select
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
              className="w-full bg-steel-700 border border-steel-500 rounded-md px-3 py-2.5 text-sm text-steel-50 focus:border-amber outline-none"
            >
              {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-xs font-mono uppercase tracking-wide text-steel-300 mb-1.5">Asset name *</label>
          <input
            required
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="e.g. Classroom Projector 07"
            className="w-full bg-steel-700 border border-steel-500 rounded-md px-3 py-2.5 text-sm text-steel-50 placeholder:text-steel-400 focus:border-amber outline-none"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-mono uppercase tracking-wide text-steel-300 mb-1.5">Location *</label>
            <input
              required
              value={form.location}
              onChange={(e) => setForm({ ...form, location: e.target.value })}
              placeholder="e.g. Building A - Room 205"
              className="w-full bg-steel-700 border border-steel-500 rounded-md px-3 py-2.5 text-sm text-steel-50 placeholder:text-steel-400 focus:border-amber outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-mono uppercase tracking-wide text-steel-300 mb-1.5">Condition</label>
            <select
              value={form.condition}
              onChange={(e) => setForm({ ...form, condition: e.target.value })}
              className="w-full bg-steel-700 border border-steel-500 rounded-md px-3 py-2.5 text-sm text-steel-50 focus:border-amber outline-none"
            >
              {CONDITIONS.map((c) => <option key={c}>{c}</option>)}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-mono uppercase tracking-wide text-steel-300 mb-1.5">Last service date</label>
            <input
              type="date"
              value={form.lastServiceDate}
              onChange={(e) => setForm({ ...form, lastServiceDate: e.target.value })}
              className="w-full bg-steel-700 border border-steel-500 rounded-md px-3 py-2.5 text-sm text-steel-50 focus:border-amber outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-mono uppercase tracking-wide text-steel-300 mb-1.5">Next service date</label>
            <input
              type="date"
              value={form.nextServiceDate}
              onChange={(e) => setForm({ ...form, nextServiceDate: e.target.value })}
              className="w-full bg-steel-700 border border-steel-500 rounded-md px-3 py-2.5 text-sm text-steel-50 focus:border-amber outline-none"
            />
          </div>
        </div>

        <button type="submit" className="w-full py-2.5 rounded-md bg-amber text-steel-950 font-semibold text-sm hover:bg-amber-light transition-colors">
          {isEdit ? 'Save changes' : 'Register asset & generate QR'}
        </button>
      </form>
    </div>
  )
}
