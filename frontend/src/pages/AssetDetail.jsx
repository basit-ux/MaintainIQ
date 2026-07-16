import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { ArrowLeft, Pencil, MapPin, Tag, Wrench } from 'lucide-react'
import { getAssetById, getIssuesForAsset, getHistoryForAsset } from '../lib/data'
import { ASSET_STATUS_STYLES, ISSUE_STATUS_STYLES, PRIORITY_STYLES, formatDate } from '../lib/helpers'
import { useAuth } from '../context/AuthContext'
import Badge from '../components/Badge'
import QRBlock from '../components/QRBlock'
import HistoryTimeline from '../components/HistoryTimeline'

export default function AssetDetail() {
  const { id } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [asset, setAsset] = useState(null)
  const [issues, setIssues] = useState([])
  const [history, setHistory] = useState([])
  const [tab, setTab] = useState('overview')

  useEffect(() => {
    let active = true
    ;(async () => {
      const a = await getAssetById(id)
      if (!active || !a) return
      setAsset(a)
      const [issuesData, historyData] = await Promise.all([getIssuesForAsset(id), getHistoryForAsset(id)])
      if (!active) return
      setIssues(issuesData.sort((x, y) => new Date(y.createdAt) - new Date(x.createdAt)))
      setHistory(historyData)
    })()
    return () => { active = false }
  }, [id])

  if (!asset) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center text-steel-300">
        Asset not found. <Link to="/assets" className="text-amber hover:underline">Back to assets</Link>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
      <button onClick={() => navigate('/assets')} className="flex items-center gap-1.5 text-sm text-steel-300 hover:text-steel-50 mb-4">
        <ArrowLeft size={15} /> Back to assets
      </button>

      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="font-mono text-xs px-2 py-1 rounded bg-steel-700 text-amber border border-amber/20">{asset.code}</span>
            <Badge className={ASSET_STATUS_STYLES[asset.status]}>{asset.status}</Badge>
          </div>
          <h1 className="font-display text-2xl sm:text-3xl font-semibold text-steel-50">{asset.name}</h1>
          <div className="flex items-center gap-4 mt-2 text-sm text-steel-300">
            <span className="flex items-center gap-1"><MapPin size={14} /> {asset.location}</span>
            <span className="flex items-center gap-1"><Tag size={14} /> {asset.category}</span>
          </div>
        </div>
        {user.role === 'admin' && (
          <Link to={`/assets/${asset.id}/edit`} className="flex items-center gap-2 px-4 py-2.5 rounded-md border border-steel-500 text-steel-100 hover:border-amber hover:text-amber transition-colors text-sm w-fit">
            <Pencil size={15} /> Edit asset
          </Link>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="flex gap-1 border-b border-steel-500">
            {['overview', 'issues', 'history'].map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`px-4 py-2.5 text-sm font-medium capitalize border-b-2 -mb-px transition-colors ${
                  tab === t ? 'border-amber text-amber' : 'border-transparent text-steel-300 hover:text-steel-50'
                }`}
              >
                {t} {t === 'issues' && issues.length ? `(${issues.length})` : ''}
              </button>
            ))}
          </div>

          {tab === 'overview' && (
            <div className="bg-steel-800 border border-steel-500 rounded-lg p-5 grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs font-mono uppercase text-steel-300 mb-1">Condition</p>
                <p className="text-steel-50">{asset.condition}</p>
              </div>
              <div>
                <p className="text-xs font-mono uppercase text-steel-300 mb-1">Category</p>
                <p className="text-steel-50">{asset.category}</p>
              </div>
              <div>
                <p className="text-xs font-mono uppercase text-steel-300 mb-1">Last service</p>
                <p className="text-steel-50">{formatDate(asset.lastServiceDate)}</p>
              </div>
              <div>
                <p className="text-xs font-mono uppercase text-steel-300 mb-1">Next service due</p>
                <p className="text-steel-50">{formatDate(asset.nextServiceDate)}</p>
              </div>
              <div className="col-span-2">
                <p className="text-xs font-mono uppercase text-steel-300 mb-1">Registered on</p>
                <p className="text-steel-50">{formatDate(asset.createdAt)}</p>
              </div>
            </div>
          )}

          {tab === 'issues' && (
            <div className="space-y-3">
              {issues.length === 0 ? (
                <div className="text-center py-10 border border-dashed border-steel-500 rounded-lg text-steel-300 text-sm">
                  No issues reported for this asset.
                </div>
              ) : issues.map((issue) => (
                <Link key={issue.id} to={`/issues/${issue.id}`} className="flex items-center justify-between gap-3 bg-steel-800 border border-steel-500 rounded-lg p-4 hover:border-amber/50 transition-colors">
                  <div>
                    <p className="text-sm font-medium text-steel-50 flex items-center gap-2"><Wrench size={14} className="text-steel-400" /> {issue.title}</p>
                    <p className="text-xs text-steel-300 mt-1 font-mono">{issue.issueNumber} · {formatDate(issue.createdAt)}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge className={PRIORITY_STYLES[issue.priority]}>{issue.priority}</Badge>
                    <Badge className={ISSUE_STATUS_STYLES[issue.status]}>{issue.status}</Badge>
                  </div>
                </Link>
              ))}
            </div>
          )}

          {tab === 'history' && (
            <div className="bg-steel-800 border border-steel-500 rounded-lg p-5">
              <HistoryTimeline entries={history} />
            </div>
          )}
        </div>

        <div>
          <QRBlock asset={asset} />
        </div>
      </div>
    </div>
  )
}
