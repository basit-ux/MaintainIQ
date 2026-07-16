import { Link } from 'react-router-dom'
import { ScanLine } from 'lucide-react'

export default function NotFound() {
  return (
    <div className="min-h-screen bg-grid flex items-center justify-center px-4">
      <div className="text-center">
        <ScanLine size={40} className="text-steel-400 mx-auto mb-4" />
        <h1 className="font-display text-2xl font-semibold text-steel-50 mb-2">Page not found</h1>
        <p className="text-steel-300 text-sm mb-4">The page you're looking for doesn't exist.</p>
        <Link to="/dashboard" className="text-amber hover:underline text-sm">Back to dashboard</Link>
      </div>
    </div>
  )
}
