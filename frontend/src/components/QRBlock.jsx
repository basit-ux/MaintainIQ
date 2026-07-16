import { useRef } from 'react'
import { QRCodeCanvas } from 'qrcode.react'
import { Download, Copy, ExternalLink, Check } from 'lucide-react'
import { useState } from 'react'
import { publicAssetUrl } from '../lib/helpers'

export default function QRBlock({ asset }) {
  const canvasRef = useRef(null)
  const [copied, setCopied] = useState(false)
  const url = publicAssetUrl(asset.code)

  function handleDownload() {
    const canvas = canvasRef.current?.querySelector('canvas')
    if (!canvas) return
    const link = document.createElement('a')
    link.download = `${asset.code}-qr-label.png`
    link.href = canvas.toDataURL('image/png')
    link.click()
  }

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      /* clipboard may be blocked in some contexts — silently ignore */
    }
  }

  return (
    <div className="tag-corner border border-steel-500 bg-steel-800 rounded-lg p-5">
      <div className="flex items-start justify-between mb-4">
        <div>
          <p className="text-[10px] font-mono uppercase tracking-widest text-steel-300">Asset Label</p>
          <p className="font-display font-semibold text-steel-50">{asset.name}</p>
        </div>
        <span className="font-mono text-xs px-2 py-1 rounded bg-steel-700 text-amber border border-amber/20">{asset.code}</span>
      </div>

      <div ref={canvasRef} className="bg-white rounded-md p-3 w-fit mx-auto">
        <QRCodeCanvas value={url} size={160} level="M" bgColor="#ffffff" fgColor="#0F1417" />
      </div>

      <p className="text-center text-[11px] text-steel-300 mt-3 font-mono break-all">{url}</p>
      <p className="text-center text-xs text-steel-400 mt-1">Scan to open this asset's public page and report an issue.</p>

      <div className="grid grid-cols-3 gap-2 mt-4">
        <button onClick={handleDownload} className="flex flex-col items-center gap-1 py-2 rounded-md border border-steel-500 text-steel-200 hover:border-amber hover:text-amber transition-colors text-xs">
          <Download size={15} /> Download
        </button>
        <button onClick={handleCopy} className="flex flex-col items-center gap-1 py-2 rounded-md border border-steel-500 text-steel-200 hover:border-amber hover:text-amber transition-colors text-xs">
          {copied ? <Check size={15} className="text-ok" /> : <Copy size={15} />} {copied ? 'Copied' : 'Copy link'}
        </button>
        <a href={url} target="_blank" rel="noreferrer" className="flex flex-col items-center gap-1 py-2 rounded-md border border-steel-500 text-steel-200 hover:border-amber hover:text-amber transition-colors text-xs">
          <ExternalLink size={15} /> Open page
        </a>
      </div>
    </div>
  )
}
