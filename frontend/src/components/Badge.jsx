export default function Badge({ children, className = '' }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-mono font-medium tracking-wide whitespace-nowrap ${className}`}
    >
      {children}
    </span>
  )
}
