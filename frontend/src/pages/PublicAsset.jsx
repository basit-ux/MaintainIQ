import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ScanLine, MapPin, Tag, Sparkles, Loader2, RefreshCcw, CheckCircle2, AlertTriangle, ShieldAlert } from 'lucide-react'
import { getAssetByCode, getHistoryForAsset, createIssue, PRIORITIES } from '../lib/data'
import { runAiTriageAsync } from '../lib/aiTriage'
import { ASSET_STATUS_STYLES, formatDate } from '../lib/helpers'
import Badge from '../components/Badge'

const CATEGORIES = ['Electronics', 'HVAC', 'Plumbing', 'Electrical', 'Mechanical', 'Structural / Physical Damage', 'General']

export default function PublicAsset() {
  const { code } = useParams()
  const [asset, setAsset] = useState(undefined) // undefined = loading, null = not found
  const [recentActivity, setRecentActivity] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [complaint, setComplaint] = useState('')
  const [aiState, setAiState] = useState('idle') // idle | loading | done | error
  const [aiResult, setAiResult] = useState(null)
  const [aiError, setAiError] = useState('')
  const [form, setForm] = useState({ title: '', category: 'General', priority: 'Medium', reporterName: '', reporterContact: '' })
  const [edited, setEdited] = useState(false)
  const [submitted, setSubmitted] = useState(null)
  const [submitError, setSubmitError] = useState('')

  useEffect(() => {
    let active = true
    ;(async () => {
      const found = await getAssetByCode(code)
      if (!active) return
      setAsset(found || null)
      if (found) {
        const history = await getHistoryForAsset(found.id)
        if (active) setRecentActivity(history.slice(0, 5))
      }
    })()
    return () => { active = false }
  }, [code])

  async function handleRunAi() {
    if (complaint.trim().length < 8) {
      setAiError('Please describe the problem in a bit more detail (at least a short sentence).')
      setAiState('error')
      return
    }
    setAiState('loading')
    setAiError('')
    try {
      const result = await runAiTriageAsync({ complaint, asset })
      setAiResult(result)
      setForm({
        title: result.title,
        category: result.category,
        priority: result.priority,
        reporterName: form.reporterName,
        reporterContact: form.reporterContact,
      })
      setEdited(false)
      setAiState('done')
    } catch (err) {
      setAiError(err.message || 'AI triage is unavailable right now. You can still fill in the details manually below.')
      setAiState('error')
    }
  }

  function handleFieldChange(patch) {
    setForm((f) => ({ ...f, ...patch }))
    setEdited(true)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setSubmitError('')
    if (!form.title.trim() || !complaint.trim()) {
      setSubmitError('Please provide both a title and a description of the problem.')
      return
    }
    const result = await createIssue({
      assetId: asset.id,
      title: form.title,
      description: complaint,
      category: form.category,
      priority: form.priority,
      reporterName: form.reporterName,
      reporterContact: form.reporterContact,
      aiSuggested: aiResult,
      aiEdited: edited,
    })
    if (!result.ok) {
      setSubmitError(result.error)
      return
    }
    setSubmitted(result.issue)
  }

  if (asset === undefined) {
    return <div className="min-h-screen flex items-center justify-center text-steel-300">Loading asset…</div>
  }

  if (asset === null) {
    return (
      <div className="min-h-screen bg-grid flex items-center justify-center px-4">
        <div className="text-center max-w-sm">
          <ScanLine size={40} className="text-steel-400 mx-auto mb-4" />
          <h1 className="font-display text-xl font-semibold text-steel-50 mb-2">Asset not found</h1>
          <p className="text-steel-300 text-sm">The code "{code}" doesn't match any registered asset. Double-check the QR code or link and try again.</p>
        </div>
      </div>
    )
  }

  if (asset.status === 'Retired') {
    return (
      <div className="min-h-screen bg-grid flex items-center justify-center px-4">
        <div className="text-center max-w-sm">
          <ShieldAlert size={40} className="text-steel-400 mx-auto mb-4" />
          <h1 className="font-display text-xl font-semibold text-steel-50 mb-2">{asset.name}</h1>
          <Badge className={ASSET_STATUS_STYLES.Retired}>Retired</Badge>
          <p className="text-steel-300 text-sm mt-3">This asset has been permanently retired and is no longer in active service.</p>
        </div>
      </div>
    )
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-grid flex items-center justify-center px-4">
        <div className="text-center max-w-sm bg-steel-800 border border-steel-500 rounded-lg p-8 tag-corner">
          <CheckCircle2 size={40} className="text-ok mx-auto mb-4" />
          <h1 className="font-display text-xl font-semibold text-steel-50 mb-2">Issue reported</h1>
          <p className="text-steel-300 text-sm mb-4">Your report has been logged as <span className="font-mono text-amber">{submitted.issueNumber}</span> and the maintenance team has been notified.</p>
          <Link to={`/asset/${asset.code}`} onClick={() => window.location.reload()} className="text-sm text-amber hover:underline">Back to asset page</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-grid">
      <header className="border-b border-steel-500 bg-steel-900/95">
        <div className="max-w-2xl mx-auto px-4 h-16 flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-md bg-amber/15 border border-amber/30 flex items-center justify-center">
            <ScanLine size={18} className="text-amber" />
          </div>
          <span className="font-display font-semibold text-lg text-steel-50">Maintain<span className="text-amber">IQ</span></span>
          <span className="text-xs text-steel-400 ml-auto font-mono">Public asset page</span>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8">
        <div className="tag-corner bg-steel-800 border border-steel-500 rounded-lg p-6 mb-6">
          <div className="flex items-center gap-2 mb-3">
            <span className="font-mono text-xs px-2 py-1 rounded bg-steel-700 text-amber border border-amber/20">{asset.code}</span>
            <Badge className={ASSET_STATUS_STYLES[asset.status]}>{asset.status}</Badge>
          </div>
          <h1 className="font-display text-2xl font-semibold text-steel-50 mb-2">{asset.name}</h1>
          <div className="flex flex-wrap items-center gap-4 text-sm text-steel-300 mb-4">
            <span className="flex items-center gap-1"><MapPin size={14} /> {asset.location}</span>
            <span className="flex items-center gap-1"><Tag size={14} /> {asset.category}</span>
          </div>
          <div className="grid grid-cols-2 gap-4 text-sm border-t border-steel-500 pt-4">
            <div>
              <p className="text-xs font-mono uppercase text-steel-400 mb-1">Last service</p>
              <p className="text-steel-100">{formatDate(asset.lastServiceDate)}</p>
            </div>
            <div>
              <p className="text-xs font-mono uppercase text-steel-400 mb-1">Next service due</p>
              <p className="text-steel-100">{formatDate(asset.nextServiceDate)}</p>
            </div>
          </div>
        </div>

        {recentActivity.length > 0 && (
          <div className="bg-steel-800 border border-steel-500 rounded-lg p-5 mb-6">
            <p className="text-xs font-mono uppercase tracking-wide text-steel-300 mb-3">Recent activity</p>
            <ul className="space-y-2">
              {recentActivity.map((h) => (
                <li key={h.id} className="text-sm text-steel-200 flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber mt-1.5 shrink-0" />
                  {h.action}
                </li>
              ))}
            </ul>
          </div>
        )}

        {!showForm ? (
          <button
            onClick={() => setShowForm(true)}
            className="w-full py-3.5 rounded-md bg-amber text-steel-950 font-semibold text-sm hover:bg-amber-light transition-colors"
          >
            Report an issue with this asset
          </button>
        ) : (
          <form onSubmit={handleSubmit} className="bg-steel-800 border border-steel-500 rounded-lg p-6 space-y-5">
            <h2 className="font-display font-semibold text-steel-50">Report an issue</h2>

            <div>
              <label className="block text-xs font-mono uppercase tracking-wide text-steel-300 mb-1.5">Describe the problem</label>
              <textarea
                rows={3}
                value={complaint}
                onChange={(e) => setComplaint(e.target.value)}
                placeholder="e.g. The projector display is flickering and sometimes does not detect HDMI."
                className="w-full bg-steel-700 border border-steel-500 rounded-md px-3 py-2.5 text-sm text-steel-50 placeholder:text-steel-400 focus:border-amber outline-none resize-none"
              />
              <button
                type="button"
                onClick={handleRunAi}
                disabled={aiState === 'loading'}
                className="mt-2 flex items-center gap-2 px-3 py-2 rounded-md border border-amber/40 text-amber text-xs font-medium hover:bg-amber/10 transition-colors disabled:opacity-60"
              >
                {aiState === 'loading' ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                {aiState === 'loading' ? 'Analyzing with AI…' : 'Analyze with AI Triage'}
              </button>
            </div>

            {aiState === 'error' && (
              <div className="flex items-start gap-2 text-sm bg-danger/10 border border-danger/30 text-danger rounded-md px-3 py-2">
                <AlertTriangle size={16} className="shrink-0 mt-0.5" />
                <div>
                  <p>{aiError}</p>
                  <button type="button" onClick={handleRunAi} className="flex items-center gap-1 mt-1.5 text-xs underline">
                    <RefreshCcw size={12} /> Retry
                  </button>
                </div>
              </div>
            )}

            {aiState === 'done' && aiResult && (
              <div className="bg-steel-700/60 border border-amber/20 rounded-md p-4 space-y-2">
                <p className="flex items-center gap-1.5 text-xs font-mono uppercase tracking-wide text-amber"><Sparkles size={12} /> AI suggestion — review before submitting</p>
                {aiResult.safetyNote && (
                  <p className="flex items-start gap-1.5 text-xs text-danger bg-danger/10 border border-danger/30 rounded px-2 py-1.5"><ShieldAlert size={13} className="shrink-0 mt-0.5" /> {aiResult.safetyNote}</p>
                )}
                {aiResult.recurringWarning && (
                  <p className="text-xs text-warn bg-warn/10 border border-warn/30 rounded px-2 py-1.5">{aiResult.recurringWarning}</p>
                )}
                <div>
                  <p className="text-xs text-steel-300 mb-1">Possible causes</p>
                  <ul className="text-sm text-steel-100 list-disc list-inside space-y-0.5">
                    {aiResult.possibleCauses.map((c, i) => <li key={i}>{c}</li>)}
                  </ul>
                </div>
                <div>
                  <p className="text-xs text-steel-300 mb-1">Initial checks</p>
                  <ul className="text-sm text-steel-100 list-disc list-inside space-y-0.5">
                    {aiResult.initialChecks.map((c, i) => <li key={i}>{c}</li>)}
                  </ul>
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-mono uppercase tracking-wide text-steel-300 mb-1.5">Issue title *</label>
              <input
                required
                value={form.title}
                onChange={(e) => handleFieldChange({ title: e.target.value })}
                placeholder="Short, clear title"
                className="w-full bg-steel-700 border border-steel-500 rounded-md px-3 py-2.5 text-sm text-steel-50 placeholder:text-steel-400 focus:border-amber outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-mono uppercase tracking-wide text-steel-300 mb-1.5">Category</label>
                <select value={form.category} onChange={(e) => handleFieldChange({ category: e.target.value })} className="w-full bg-steel-700 border border-steel-500 rounded-md px-3 py-2.5 text-sm text-steel-50 focus:border-amber outline-none">
                  {CATEGORIES.includes(form.category) ? null : <option>{form.category}</option>}
                  {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-mono uppercase tracking-wide text-steel-300 mb-1.5">Priority</label>
                <select value={form.priority} onChange={(e) => handleFieldChange({ priority: e.target.value })} className="w-full bg-steel-700 border border-steel-500 rounded-md px-3 py-2.5 text-sm text-steel-50 focus:border-amber outline-none">
                  {PRIORITIES.map((p) => <option key={p}>{p}</option>)}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-mono uppercase tracking-wide text-steel-300 mb-1.5">Your name</label>
                <input
                  value={form.reporterName}
                  onChange={(e) => setForm({ ...form, reporterName: e.target.value })}
                  placeholder="Optional"
                  className="w-full bg-steel-700 border border-steel-500 rounded-md px-3 py-2.5 text-sm text-steel-50 placeholder:text-steel-400 focus:border-amber outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-mono uppercase tracking-wide text-steel-300 mb-1.5">Contact</label>
                <input
                  value={form.reporterContact}
                  onChange={(e) => setForm({ ...form, reporterContact: e.target.value })}
                  placeholder="Phone or email (optional)"
                  className="w-full bg-steel-700 border border-steel-500 rounded-md px-3 py-2.5 text-sm text-steel-50 placeholder:text-steel-400 focus:border-amber outline-none"
                />
              </div>
            </div>

            {submitError && (
              <div className="flex items-start gap-2 text-sm bg-danger/10 border border-danger/30 text-danger rounded-md px-3 py-2">
                <AlertTriangle size={16} className="shrink-0 mt-0.5" />
                <span>{submitError}</span>
              </div>
            )}

            <button type="submit" className="w-full py-2.5 rounded-md bg-amber text-steel-950 font-semibold text-sm hover:bg-amber-light transition-colors">
              Submit issue report
            </button>
          </form>
        )}
      </main>
    </div>
  )
}
