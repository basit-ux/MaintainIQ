import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { ArrowLeft, Sparkles, ShieldAlert, AlertCircle, UserCog } from 'lucide-react'
import { getIssueById, getAssetById, assignIssue, updateIssueStatus } from '../lib/data'
import { getTechnicians as authTechs } from '../lib/auth'
import { ISSUE_STATUS_STYLES, PRIORITY_STYLES, ASSET_STATUS_STYLES, formatDateTime, formatDate } from '../lib/helpers'
import { useAuth } from '../context/AuthContext'
import Badge from '../components/Badge'

const NEXT_STATUS_OPTIONS = {
  Reported: ['Assigned'],
  Assigned: ['Inspection Started'],
  'Inspection Started': ['Maintenance In Progress', 'Waiting for Parts'],
  'Waiting for Parts': ['Maintenance In Progress'],
  'Maintenance In Progress': ['Resolved', 'Waiting for Parts'],
  Resolved: ['Closed', 'Reopened'],
  Closed: ['Reopened'],
  Reopened: ['Assigned', 'Inspection Started'],
}

export default function IssueDetail() {
  const { id } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [issue, setIssue] = useState(null)
  const [asset, setAsset] = useState(null)
  const [technicianId, setTechnicianId] = useState('')
  const [error, setError] = useState('')
  const [technicians, setTechnicians] = useState([])
  const [maintForm, setMaintForm] = useState({ notes: '', partsUsed: '', cost: '', timeSpentHours: '', finalCondition: '', nextServiceDate: '', markOutOfService: false })

  async function reload() {
    const i = await getIssueById(id)
    setIssue(i)
    if (i) setAsset(await getAssetById(i.assetId))
    if (i?.maintenance) {
      setMaintForm((f) => ({ ...f, notes: i.maintenance.notes || '', partsUsed: i.maintenance.partsUsed || '', cost: i.maintenance.cost ?? '', timeSpentHours: i.maintenance.timeSpentHours || '', finalCondition: i.maintenance.finalCondition || '' }))
    }
  }

  useEffect(() => { reload() }, [id])
  useEffect(() => { authTechs().then(setTechnicians) }, [])

  if (!issue || !asset) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center text-steel-300">
        Issue not found. <Link to="/issues" className="text-amber hover:underline">Back to issues</Link>
      </div>
    )
  }

  const isAssignedTech = user.role === 'technician' && issue.assignedTechnicianId === user.id
  const canAct = user.role === 'admin' || isAssignedTech
  const nextOptions = NEXT_STATUS_OPTIONS[issue.status] || []

  async function handleAssign(e) {
    e.preventDefault()
    setError('')
    const tech = technicians.find((t) => t.id === technicianId)
    if (!tech) { setError('Select a technician first.'); return }
    const result = await assignIssue(issue.id, tech.id, tech.name, user)
    if (!result.ok) { setError(result.error); return }
    reload()
  }

  async function handleStatusChange(newStatus) {
    setError('')
    if (newStatus === 'Resolved' && !maintForm.notes.trim() && !issue.maintenance?.notes) {
      setError('Add a maintenance note before resolving this issue.')
      return
    }
    const result = await updateIssueStatus(issue.id, newStatus, user, {
      maintenanceNote: maintForm.notes,
      partsUsed: maintForm.partsUsed,
      cost: maintForm.cost === '' ? undefined : Number(maintForm.cost),
      timeSpentHours: maintForm.timeSpentHours,
      finalCondition: maintForm.finalCondition,
      nextServiceDate: maintForm.nextServiceDate || undefined,
      markOutOfService: maintForm.markOutOfService,
    })
    if (!result.ok) { setError(result.error); return }
    reload()
  }

  const showMaintenanceForm = ['Inspection Started', 'Maintenance In Progress', 'Waiting for Parts'].includes(issue.status) && canAct

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
      <button onClick={() => navigate('/issues')} className="flex items-center gap-1.5 text-sm text-steel-300 hover:text-steel-50 mb-4">
        <ArrowLeft size={15} /> Back to issues
      </button>

      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-2">
        <div>
          <p className="font-mono text-xs text-amber mb-1">{issue.issueNumber}</p>
          <h1 className="font-display text-2xl font-semibold text-steel-50">{issue.title}</h1>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Badge className={PRIORITY_STYLES[issue.priority]}>{issue.priority}</Badge>
          <Badge className={ISSUE_STATUS_STYLES[issue.status]}>{issue.status}</Badge>
        </div>
      </div>

      <Link to={`/assets/${asset.id}`} className="inline-flex items-center gap-2 text-sm text-steel-300 hover:text-amber mb-6">
        On <span className="font-medium text-steel-100">{asset.name}</span>
        <Badge className={ASSET_STATUS_STYLES[asset.status]}>{asset.status}</Badge>
      </Link>

      {error && (
        <div className="flex items-start gap-2 text-sm bg-danger/10 border border-danger/30 text-danger rounded-md px-3 py-2 mb-5">
          <AlertCircle size={16} className="shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-5">
          <div className="bg-steel-800 border border-steel-500 rounded-lg p-5">
            <p className="text-xs font-mono uppercase tracking-wide text-steel-300 mb-2">Description</p>
            <p className="text-sm text-steel-100 leading-relaxed">{issue.description}</p>
            <div className="flex flex-wrap gap-4 mt-4 pt-4 border-t border-steel-500 text-xs text-steel-300">
              <span>Reported by <span className="text-steel-100">{issue.reporterName}</span></span>
              <span>{formatDateTime(issue.createdAt)}</span>
              <span>Category: <span className="text-steel-100">{issue.category}</span></span>
            </div>
          </div>

          {issue.aiSuggested && (
            <div className="bg-steel-800 border border-amber/20 rounded-lg p-5">
              <p className="flex items-center gap-1.5 text-xs font-mono uppercase tracking-wide text-amber mb-3">
                <Sparkles size={13} /> AI triage suggestion {issue.aiEdited && <span className="text-steel-400 normal-case">(edited by reporter)</span>}
              </p>
              {issue.aiSuggested.safetyNote && (
                <p className="flex items-start gap-1.5 text-xs text-danger bg-danger/10 border border-danger/30 rounded px-2 py-1.5 mb-2">
                  <ShieldAlert size={13} className="shrink-0 mt-0.5" /> {issue.aiSuggested.safetyNote}
                </p>
              )}
              <div className="grid sm:grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-xs text-steel-300 mb-1">Possible causes</p>
                  <ul className="list-disc list-inside text-steel-100 space-y-0.5">
                    {issue.aiSuggested.possibleCauses?.map((c, i) => <li key={i}>{c}</li>)}
                  </ul>
                </div>
                <div>
                  <p className="text-xs text-steel-300 mb-1">Initial checks</p>
                  <ul className="list-disc list-inside text-steel-100 space-y-0.5">
                    {issue.aiSuggested.initialChecks?.map((c, i) => <li key={i}>{c}</li>)}
                  </ul>
                </div>
              </div>
            </div>
          )}

          {showMaintenanceForm && (
            <div className="bg-steel-800 border border-steel-500 rounded-lg p-5 space-y-4">
              <p className="text-xs font-mono uppercase tracking-wide text-steel-300">Maintenance record</p>
              <div>
                <label className="block text-xs text-steel-300 mb-1.5">Inspection / work notes *</label>
                <textarea rows={3} value={maintForm.notes} onChange={(e) => setMaintForm({ ...maintForm, notes: e.target.value })} className="w-full bg-steel-700 border border-steel-500 rounded-md px-3 py-2.5 text-sm text-steel-50 focus:border-amber outline-none resize-none" placeholder="What was found and what was done…" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-steel-300 mb-1.5">Parts used</label>
                  <input value={maintForm.partsUsed} onChange={(e) => setMaintForm({ ...maintForm, partsUsed: e.target.value })} className="w-full bg-steel-700 border border-steel-500 rounded-md px-3 py-2.5 text-sm text-steel-50 focus:border-amber outline-none" placeholder="e.g. HDMI cable" />
                </div>
                <div>
                  <label className="block text-xs text-steel-300 mb-1.5">Cost</label>
                  <input type="number" min="0" step="0.01" value={maintForm.cost} onChange={(e) => setMaintForm({ ...maintForm, cost: e.target.value })} className="w-full bg-steel-700 border border-steel-500 rounded-md px-3 py-2.5 text-sm text-steel-50 focus:border-amber outline-none" placeholder="0.00" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-steel-300 mb-1.5">Time spent (hrs)</label>
                  <input type="number" min="0" step="0.25" value={maintForm.timeSpentHours} onChange={(e) => setMaintForm({ ...maintForm, timeSpentHours: e.target.value })} className="w-full bg-steel-700 border border-steel-500 rounded-md px-3 py-2.5 text-sm text-steel-50 focus:border-amber outline-none" />
                </div>
                <div>
                  <label className="block text-xs text-steel-300 mb-1.5">Next service date</label>
                  <input type="date" value={maintForm.nextServiceDate} onChange={(e) => setMaintForm({ ...maintForm, nextServiceDate: e.target.value })} className="w-full bg-steel-700 border border-steel-500 rounded-md px-3 py-2.5 text-sm text-steel-50 focus:border-amber outline-none" />
                </div>
              </div>
              <div>
                <label className="block text-xs text-steel-300 mb-1.5">Final condition</label>
                <input value={maintForm.finalCondition} onChange={(e) => setMaintForm({ ...maintForm, finalCondition: e.target.value })} className="w-full bg-steel-700 border border-steel-500 rounded-md px-3 py-2.5 text-sm text-steel-50 focus:border-amber outline-none" placeholder="e.g. Good — fully operational" />
              </div>
              {issue.priority === 'Critical' && (
                <label className="flex items-center gap-2 text-sm text-steel-200">
                  <input type="checkbox" checked={maintForm.markOutOfService} onChange={(e) => setMaintForm({ ...maintForm, markOutOfService: e.target.checked })} className="accent-amber" />
                  Mark asset as Out of Service until fixed
                </label>
              )}
            </div>
          )}
        </div>

        <div className="space-y-5">
          <div className="bg-steel-800 border border-steel-500 rounded-lg p-5">
            <p className="text-xs font-mono uppercase tracking-wide text-steel-300 mb-3 flex items-center gap-1.5"><UserCog size={13} /> Assignment</p>
            {issue.assignedTechnicianId ? (
              <p className="text-sm text-steel-100">
                {technicians.find((t) => t.id === issue.assignedTechnicianId)?.name || 'Technician'}
              </p>
            ) : user.role === 'admin' ? (
              <form onSubmit={handleAssign} className="space-y-2">
                <select value={technicianId} onChange={(e) => setTechnicianId(e.target.value)} className="w-full bg-steel-700 border border-steel-500 rounded-md px-3 py-2 text-sm text-steel-50 focus:border-amber outline-none">
                  <option value="">Select technician…</option>
                  {technicians.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
                <button type="submit" className="w-full py-2 rounded-md bg-amber text-steel-950 font-semibold text-sm hover:bg-amber-light transition-colors">Assign</button>
              </form>
            ) : (
              <p className="text-sm text-steel-300">Not yet assigned.</p>
            )}
          </div>

          {canAct && nextOptions.length > 0 && (
            <div className="bg-steel-800 border border-steel-500 rounded-lg p-5">
              <p className="text-xs font-mono uppercase tracking-wide text-steel-300 mb-3">Update status</p>
              <div className="flex flex-col gap-2">
                {nextOptions.map((status) => (
                  <button
                    key={status}
                    onClick={() => handleStatusChange(status)}
                    className="w-full py-2 rounded-md border border-steel-500 text-sm text-steel-100 hover:border-amber hover:text-amber transition-colors"
                  >
                    Move to "{status}"
                  </button>
                ))}
              </div>
            </div>
          )}

          {issue.maintenance?.notes && (
            <div className="bg-steel-800 border border-steel-500 rounded-lg p-5 text-sm">
              <p className="text-xs font-mono uppercase tracking-wide text-steel-300 mb-2">Recorded maintenance</p>
              <p className="text-steel-100 mb-2">{issue.maintenance.notes}</p>
              <div className="text-xs text-steel-300 space-y-1">
                {issue.maintenance.partsUsed && <p>Parts: {issue.maintenance.partsUsed}</p>}
                {issue.maintenance.cost != null && <p>Cost: {issue.maintenance.cost}</p>}
                {issue.maintenance.resolvedAt && <p>Resolved: {formatDate(issue.maintenance.resolvedAt)}</p>}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
