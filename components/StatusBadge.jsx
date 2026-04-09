'use client'
import { STATUS_COLOURS } from '@/lib/mockData'

export default function StatusBadge({ status, size = 'md' }) {
  const colours = STATUS_COLOURS[status] || STATUS_COLOURS.draft
  const sizes = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-xs px-2.5 py-1',
    lg: 'text-sm px-3 py-1.5',
  }

  return (
    <span className={`inline-flex items-center gap-1.5 font-semibold rounded-full ${colours.bg} ${colours.text} ${sizes[size]}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${colours.dot}`} />
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  )
}
