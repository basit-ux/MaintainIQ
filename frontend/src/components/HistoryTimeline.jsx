import { History } from 'lucide-react'
import { formatDateTime } from '../lib/helpers'

export default function HistoryTimeline({ entries }) {
  if (!entries?.length) {
    return (
      <div className="text-center py-10 text-steel-300 text-sm border border-dashed border-steel-500 rounded-lg">
        No activity recorded for this asset yet.
      </div>
    )
  }

  return (
    <ol className="relative border-l border-steel-500 ml-2">
      {entries.map((h) => (
        <li key={h.id} className="mb-5 ml-5">
          <span className="absolute -left-[7px] flex items-center justify-center w-3.5 h-3.5 rounded-full bg-amber border-2 border-steel-900" />
          <p className="text-sm text-steel-50">{h.action}</p>
          <p className="text-xs text-steel-300 mt-0.5 font-mono">
            {formatDateTime(h.timestamp)} · {h.actorName} <span className="text-steel-400">({h.actorRole})</span>
          </p>
        </li>
      ))}
    </ol>
  )
}
