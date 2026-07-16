import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Search } from 'lucide-react'
import { getIssues, getAssets, ISSUE_STATUSES, PRIORITIES } from '../lib/data'
import { ISSUE_STATUS_STYLES, PRIORITY_STYLES, formatDateTime } from '../lib/helpers'
import Badge from '../components/Badge'

export default function Issues() {
  const [issues, setIssues] = useState([])
  const [assetsById, setAssetsById] = useState({})
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('All')
  const [priorityFilter, setPriorityFilter] = useState('All')

  useEffect(() => {
    let active = true
    ;(async () => {
      const [issuesData, assetsData] = await Promise.all([getIssues(), getAssets()])
      if (!active) return
      setIssues(issuesData.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)))
      setAssetsById(Object.fromEntries(assetsData.map((a) => [a.id, a])))
    })()
    return () => { active = false }
  }, [])

  const filtered = useMemo(() => {
    return issues.filter((i) => {
      const q = query.trim().toLowerCase()
      const asset = assetsById[i.assetId]
      const matchesQuery = !q || i.title.toLowerCase().includes(q) || i.issueNumber.toLowerCase().includes(q) || asset?.name.toLowerCase().includes(q)
      const matchesStatus = statusFilter === 'All' || i.status === statusFilter
      const matchesPriority = priorityFilter === 'All' || i.priority === priorityFilter
      return matchesQuery && matchesStatus && matchesPriority
    })
  }, [issues, assetsById, query, statusFilter, priorityFilter])

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      <p className="text-xs font-mono uppercase tracking-widest text-amber mb-1.5">Workflow</p>
      <h1 className="font-display text-2xl font-semibold text-steel-50 mb-6">Issues</h1>

      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-steel-300" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by title, issue number, or asset…"
            className="w-full bg-steel-800 border border-steel-500 rounded-md pl-9 pr-3 py-2.5 text-sm text-steel-50 placeholder:text-steel-400 focus:border-amber outline-none"
          />
        </div>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="bg-steel-800 border border-steel-500 rounded-md px-3 py-2.5 text-sm text-steel-100 focus:border-amber outline-none">
          <option>All</option>
          {ISSUE_STATUSES.map((s) => <option key={s}>{s}</option>)}
        </select>
        <select value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value)} className="bg-steel-800 border border-steel-500 rounded-md px-3 py-2.5 text-sm text-steel-100 focus:border-amber outline-none">
          <option>All</option>
          {PRIORITIES.map((p) => <option key={p}>{p}</option>)}
        </select>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-steel-500 rounded-lg text-steel-300 text-sm">
          No issues match your filters.
        </div>
      ) : (
        <div className="bg-steel-800 border border-steel-500 rounded-lg divide-y divide-steel-500/60 overflow-hidden">
          {filtered.map((issue) => (
            <Link key={issue.id} to={`/issues/${issue.id}`} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-5 py-4 hover:bg-steel-700/50 transition-colors">
              <div>
                <p className="text-sm font-medium text-steel-50">{issue.title}</p>
                <p className="text-xs text-steel-300 mt-1 font-mono">
                  {issue.issueNumber} · {assetsById[issue.assetId]?.name || 'Unknown asset'} · {formatDateTime(issue.createdAt)}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Badge className={PRIORITY_STYLES[issue.priority]}>{issue.priority}</Badge>
                <Badge className={ISSUE_STATUS_STYLES[issue.status]}>{issue.status}</Badge>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
