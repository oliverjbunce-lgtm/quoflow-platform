'use client'

export default function SkeletonCard({ rows = 3, className = '' }) {
  return (
    <div className={`bg-white/80 dark:bg-zinc-900/70 backdrop-blur-xl border border-white/60 dark:border-white/10 rounded-2xl p-6 ${className}`}>
      <div className="space-y-3">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex items-center gap-3">
            <div className="skeleton h-4 rounded" style={{ width: `${60 + (i % 3) * 15}%` }} />
          </div>
        ))}
      </div>
    </div>
  )
}

export function SkeletonRow() {
  return (
    <div className="flex items-center gap-4 py-4 border-b border-gray-100 dark:border-white/5">
      <div className="skeleton h-3 rounded w-24" />
      <div className="skeleton h-3 rounded flex-1" />
      <div className="skeleton h-3 rounded w-16" />
      <div className="skeleton h-3 rounded w-20" />
      <div className="skeleton h-5 w-16 rounded-full" />
    </div>
  )
}

export function SkeletonStat() {
  return (
    <div className="bg-white/80 dark:bg-zinc-900/70 backdrop-blur-xl border border-white/60 dark:border-white/10 rounded-2xl p-6">
      <div className="skeleton h-3 w-24 rounded mb-4" />
      <div className="skeleton h-8 w-16 rounded mb-2" />
      <div className="skeleton h-3 w-20 rounded" />
    </div>
  )
}
