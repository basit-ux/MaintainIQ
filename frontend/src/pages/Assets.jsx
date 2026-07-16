import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Search, Plus, QrCode } from 'lucide-react'
import { getAssets, ASSET_STATUSES } from '../lib/data'
import { ASSET_STATUS_STYLES, formatDate } from '../lib/helpers'
import { useAuth } from '../context/AuthContext'
import Badge from '../components/Badge'

export default function Assets() {
  const { user } = useAuth()
  const [assets, setAssets] = useState([])
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('All')
  const [categoryFilter, setCategoryFilter] = useState('All')

  useEffect(() => {
    let active = true
    getAssets().then((data) => { if (active) setAssets(data) })
    return () => { active = false }
  }, [])

  const categories = useMemo(() => ['All', ...new Set(assets.map((a) => a.category))], [assets])

  const filtered = useMemo(() => {
    return assets.filter((a) => {
      const q = query.trim().toLowerCase()
      const matchesQuery = !q || a.name.toLowerCase().includes(q) || a.code.toLowerCase().includes(q) || a.location.toLowerCase().includes(q)
      const matchesStatus = statusFilter === 'All' || a.status === statusFilter
      const matchesCategory = categoryFilter === 'All' || a.category === categoryFilter
      return matchesQuery && matchesStatus && matchesCategory
    })
  }, [assets, query, statusFilter, categoryFilter])

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <p className="text-xs font-mono uppercase tracking-widest text-amber mb-1.5">Registry</p>
          <h1 className="font-display text-2xl font-semibold text-steel-50">Assets</h1>
        </div>
        {user.role === 'admin' && (
          <Link to="/assets/new" className="flex items-center gap-2 px-4 py-2.5 rounded-md bg-amber text-steel-950 font-semibold text-sm hover:bg-amber-light transition-colors w-fit">
            <Plus size={16} /> Register asset
          </Link>
        )}
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-steel-300" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name, code, or location…"
            className="w-full bg-steel-800 border border-steel-500 rounded-md pl-9 pr-3 py-2.5 text-sm text-steel-50 placeholder:text-steel-400 focus:border-amber outline-none transition-colors"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="bg-steel-800 border border-steel-500 rounded-md px-3 py-2.5 text-sm text-steel-100 focus:border-amber outline-none"
        >
          <option>All</option>
          {ASSET_STATUSES.map((s) => <option key={s}>{s}</option>)}
        </select>
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="bg-steel-800 border border-steel-500 rounded-md px-3 py-2.5 text-sm text-steel-100 focus:border-amber outline-none"
        >
          {categories.map((c) => <option key={c}>{c}</option>)}
        </select>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-steel-500 rounded-lg text-steel-300 text-sm">
          No assets match your filters.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((asset) => (
            <Link
              key={asset.id}
              to={`/assets/${asset.id}`}
              className="tag-corner group bg-steel-800 border border-steel-500 rounded-lg p-5 hover:border-amber/50 transition-colors"
            >
              <div className="flex items-start justify-between mb-3">
                <span className="font-mono text-xs px-2 py-1 rounded bg-steel-700 text-amber border border-amber/20">{asset.code}</span>
                <QrCode size={16} className="text-steel-400 group-hover:text-amber transition-colors" />
              </div>
              <p className="font-display font-semibold text-steel-50 mb-1">{asset.name}</p>
              <p className="text-xs text-steel-300 mb-3">{asset.location}</p>
              <div className="flex items-center justify-between">
                <Badge className={ASSET_STATUS_STYLES[asset.status]}>{asset.status}</Badge>
                <span className="text-[11px] text-steel-400 font-mono">Next: {formatDate(asset.nextServiceDate)}</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
