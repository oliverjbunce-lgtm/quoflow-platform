'use client'
import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import StatsCard from '@/components/StatsCard'
import { SkeletonStat } from '@/components/SkeletonCard'
import { DETECTION_COLOURS, DETECTION_LABELS } from '@/lib/mockData'

function normalise(name) {
  return DETECTION_LABELS[name] || name?.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) || 'Unknown'
}

function BarChart({ data, maxVal }) {
  return (
    <div className="flex items-end gap-2 h-32">
      {data.map((d, i) => {
        const pct = maxVal > 0 ? (d.value / maxVal) * 100 : 0
        return (
          <div key={i} className="flex-1 flex flex-col items-center gap-1">
            <span className="text-xs font-semibold text-[#1c1c1e] dark:text-[#f5f5f7]">{d.value}</span>
            <motion.div
              initial={{ height: 0 }}
              animate={{ height: `${pct}%` }}
              transition={{ duration: 0.8, delay: i * 0.06, ease: [0.16, 1, 0.3, 1] }}
              className="w-full rounded-t-lg bg-[#0A84FF]"
              style={{ minHeight: 4 }}
            />
            <span className="text-xs text-[#8e8e93] truncate w-full text-center">{d.label}</span>
          </div>
        )
      })}
    </div>
  )
}

function HorizBars({ data, maxVal }) {
  return (
    <div className="space-y-3">
      {data.map((d, i) => {
        const pct = maxVal > 0 ? (d.value / maxVal) * 100 : 0
        const colour = DETECTION_COLOURS[d.key] || '#0A84FF'
        return (
          <div key={i} className="flex items-center gap-3">
            <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: colour }} />
            <div className="flex-1 text-sm text-[#8e8e93] truncate min-w-0">{d.label}</div>
            <div className="flex-1 h-2 bg-gray-100 dark:bg-zinc-700 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${pct}%` }}
                transition={{ duration: 0.8, delay: i * 0.06 }}
                className="h-full rounded-full"
                style={{ background: colour }}
              />
            </div>
            <span className="text-sm font-black text-[#1c1c1e] dark:text-[#f5f5f7] tabular-nums w-8 text-right">{d.value}</span>
          </div>
        )
      })}
    </div>
  )
}

export default function AnalyticsPage() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/analytics')
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  const stats = data?.stats || {}
  const monthlyAnalyses = (data?.monthlyAnalyses || []).reverse().map(r => ({
    label: r.month?.slice(5) || '', value: Number(r.count)
  }))
  const monthlyRevenue = (data?.monthlyRevenue || []).reverse().map(r => ({
    label: r.month?.slice(5) || '', value: Math.round(Number(r.revenue || 0))
  }))
  const breakdown = (data?.detectionBreakdown || []).map(r => ({
    key: r.class_name, label: normalise(r.class_name), value: Number(r.count)
  }))

  const maxAnalyses = Math.max(...monthlyAnalyses.map(d => d.value), 1)
  const maxRevenue = Math.max(...monthlyRevenue.map(d => d.value), 1)
  const maxBreakdown = Math.max(...breakdown.map(d => d.value), 1)

  const winPct = stats.winRate || 0

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">

      {/* Stats row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => <SkeletonStat key={i} />)
        ) : (
          <>
            <StatsCard icon="📐" label="Total Plans" value={stats.analysesCount || 0} color="#0A84FF" />
            <StatsCard icon="📋" label="Total Quotes" value={stats.quotesCount || 0} color="#ff9f0a" />
            <StatsCard icon="✅" label="Win Rate" value={winPct} suffix="%" color="#34c759" />
            <StatsCard icon="🔍" label="Avg Components/Plan" value={stats.analysesCount > 0 ? Math.round(stats.detectionsCount / stats.analysesCount) : 0} color="#9333ea" />
          </>
        )}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Plans per month */}
        <div className="bg-white/80 dark:bg-zinc-900/70 backdrop-blur-xl border border-white/60 dark:border-white/10 rounded-2xl p-6">
          <p className="text-xs font-semibold tracking-[0.12em] uppercase text-[#8e8e93] mb-4">Plans Processed / Month</p>
          {monthlyAnalyses.length > 0
            ? <BarChart data={monthlyAnalyses} maxVal={maxAnalyses} />
            : <div className="h-32 flex items-center justify-center text-[#8e8e93] text-sm">No data yet</div>
          }
        </div>

        {/* Win rate donut */}
        <div className="bg-white/80 dark:bg-zinc-900/70 backdrop-blur-xl border border-white/60 dark:border-white/10 rounded-2xl p-6">
          <p className="text-xs font-semibold tracking-[0.12em] uppercase text-[#8e8e93] mb-4">Quote Conversion Rate</p>
          <div className="flex items-center gap-8">
            <div className="relative w-28 h-28 flex-shrink-0">
              <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                <circle cx="18" cy="18" r="15.9" fill="none" stroke="#f2f2f7" className="dark:stroke-zinc-700" strokeWidth="3" />
                <motion.circle
                  cx="18" cy="18" r="15.9" fill="none" stroke="#34c759" strokeWidth="3"
                  strokeDasharray="100"
                  initial={{ strokeDashoffset: 100 }}
                  animate={{ strokeDashoffset: 100 - winPct }}
                  transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-2xl font-black text-[#1c1c1e] dark:text-[#f5f5f7]">{winPct}%</span>
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-[#34c759]" />
                <span className="text-sm text-[#8e8e93]">Accepted ({stats.winRate || 0}%)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-gray-200 dark:bg-zinc-600" />
                <span className="text-sm text-[#8e8e93]">Other ({100 - (stats.winRate || 0)}%)</span>
              </div>
              <div className="text-sm font-black text-[#1c1c1e] dark:text-[#f5f5f7]">
                {stats.quotesCount || 0} total quotes
              </div>
            </div>
          </div>
        </div>

        {/* Revenue */}
        <div className="bg-white/80 dark:bg-zinc-900/70 backdrop-blur-xl border border-white/60 dark:border-white/10 rounded-2xl p-6">
          <p className="text-xs font-semibold tracking-[0.12em] uppercase text-[#8e8e93] mb-4">Revenue by Month (NZD)</p>
          {monthlyRevenue.length > 0
            ? <BarChart data={monthlyRevenue} maxVal={maxRevenue} />
            : <div className="h-32 flex items-center justify-center text-[#8e8e93] text-sm">No data yet</div>
          }
        </div>

        {/* Detection breakdown */}
        <div className="bg-white/80 dark:bg-zinc-900/70 backdrop-blur-xl border border-white/60 dark:border-white/10 rounded-2xl p-6">
          <p className="text-xs font-semibold tracking-[0.12em] uppercase text-[#8e8e93] mb-4">Component Detection Breakdown</p>
          {breakdown.length > 0
            ? <HorizBars data={breakdown} maxVal={maxBreakdown} />
            : <div className="py-8 text-center text-[#8e8e93] text-sm">No detections yet</div>
          }
        </div>
      </div>
    </motion.div>
  )
}
