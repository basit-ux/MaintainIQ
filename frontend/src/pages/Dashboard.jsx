import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Boxes, AlertTriangle, ShieldAlert, CheckCircle2, ArrowRight, Plus } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { getDashboardStats, getIssues, getAssets } from '../lib/data'
import { formatDateTime, ISSUE_STATUS_STYLES, PRIORITY_STYLES } from '../lib/helpers'
import Badge from '../components/Badge'

function StatCard({ icon: Icon, label, value, tone }) {
  return (
    <div className="bg-steel-800 border border-steel-500 rounded-lg p-5">
      <div className="flex items-center justify-between mb-3">
        <div className={`w-9 h-9 rounded-md flex items-center justify-center ${tone}`}>
          <Icon size={18} />
        </div>
      </div>
      <p className="text-3xl font-display font-semibold text-steel-50">{value}</p>
      <p className="text-sm text-steel-300 mt-1">{label}</p>
    </div>
  )
}

export default function Dashboard() {
  const { user } = useAuth()
  const [stats, setStats] = useState({ totalAssets: 0, operational: 0, outOfService: 0, openIssues: 0, criticalOpen: 0, resolvedThisMonth: 0 })
  const [recentIssues, setRecentIssues] = useState([])
  const [assetsById, setAssetsById] = useState({})

  useEffect(() => {
    let active = true
    ;(async () => {
      const [statsData, assets, issues] = await Promise.all([getDashboardStats(), getAssets(), getIssues()])
      if (!active) return
      setStats(statsData)
      setAssetsById(Object.fromEntries(assets.map((a) => [a.id, a])))
      setRecentIssues(issues.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 6))
    })()
    return () => { active = false }
  }, [])

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
        <div>
          <p className="text-xs font-mono uppercase tracking-widest text-amber mb-1.5">Operations Overview</p>
          <h1 className="font-display text-2xl sm:text-3xl font-semibold text-steel-50">Welcome back, {user.name.split(' ')[0]}</h1>
        </div>
        {user.role === 'admin' && (
          <Link to="/assets/new" className="flex items-center gap-2 px-4 py-2.5 rounded-md bg-amber text-steel-950 font-semibold text-sm hover:bg-amber-light transition-colors w-fit">
            <Plus size={16} /> Register asset
          </Link>
        )}
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard icon={Boxes} label="Total assets" value={stats.totalAssets} tone="bg-info/15 text-info" />
        <StatCard icon={CheckCircle2} label="Operational" value={stats.operational} tone="bg-ok/15 text-ok" />
        <StatCard icon={AlertTriangle} label="Open issues" value={stats.openIssues} tone="bg-amber/15 text-amber" />
        <StatCard icon={ShieldAlert} label="Critical & open" value={stats.criticalOpen} tone="bg-danger/15 text-danger" />
      </div>

      <div className="bg-steel-800 border border-steel-500 rounded-lg overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-steel-500">
          <h2 className="font-display font-semibold text-steel-50">Recent issues</h2>
          <Link to="/issues" className="text-sm text-amber flex items-center gap-1 hover:underline">
            View all <ArrowRight size={14} />
          </Link>
        </div>
        {recentIssues.length === 0 ? (
          <p className="text-center text-steel-300 text-sm py-10">No issues reported yet.</p>
        ) : (
          <div className="divide-y divide-steel-500/60">
            {recentIssues.map((issue) => (
              <Link
                key={issue.id}
                to={`/issues/${issue.id}`}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-5 py-4 hover:bg-steel-700/50 transition-colors"
              >
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
    </div>
  )
}
