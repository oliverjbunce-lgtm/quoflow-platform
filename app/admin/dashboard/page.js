'use client'
import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useRouter } from 'next/navigation'
import { ScanLine, FileText, Clock, Search, DollarSign, ChevronRight } from 'lucide-react'
import StatsCard from '@/components/StatsCard'
import StatusBadge from '@/components/StatusBadge'
import EmptyState from '@/components/EmptyState'
import AnalysisOverlay from '@/components/AnalysisOverlay'
import { SkeletonStat, SkeletonRow } from '@/components/SkeletonCard'
import OnboardingTour from '@/components/OnboardingTour'

const container = { hidden: {}, show: { transition: { staggerChildren: 0.06 } } }
const item = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0, transition: { duration: 0.4 } } }

function timeAgo(ts) {
  if (!ts) return ''
  const diff = Math.floor(Date.now() / 1000) - Number(ts)
  if (diff < 60) return 'Just now'
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}

function ActivityDot({ type }) {
  const colours = {
    analysis: 'bg-[#0A84FF]',
    quote: 'bg-[#ff9f0a]',
    order: 'bg-[#34c759]',
    builder: 'bg-[#9333ea]',
  }
  return <div className={`w-2 h-2 rounded-full flex-shrink-0 mt-1.5 ${colours[type] || 'bg-[#8e8e93]'}`} />
}

export default function DashboardPage() {
  const [stats, setStats] = useState(null)
  const [quotes, setQuotes] = useState([])
  const [loading, setLoading] = useState(true)
  const [showOverlay, setShowOverlay] = useState(false)
  const [showOnboarding, setShowOnboarding] = useState(false)
  const router = useRouter()

  useEffect(() => {
    Promise.all([
      fetch('/api/analytics').then(r => r.json()),
      fetch('/api/quotes?limit=5').then(r => r.json()),
    ]).then(([analyticsData, quotesData]) => {
      setStats(analyticsData.stats || {})
      setQuotes(quotesData.quotes?.slice(0, 6) || [])
      setLoading(false)
    }).catch(() => setLoading(false))

    fetch('/api/onboarding')
      .then(r => r.json())
      .then(data => { if (!data.completed) setShowOnboarding(true) })
      .catch(() => {})
  }, [])

  async function completeOnboarding() {
    await fetch('/api/onboarding', { method: 'POST' })
    setShowOnboarding(false)
  }

  return (
    <>
      {showOnboarding && <OnboardingTour onComplete={completeOnboarding} />}
      <AnimatePresence>
        {showOverlay && (
          <AnalysisOverlay onClose={() => setShowOverlay(false)} />
        )}
      </AnimatePresence>

      <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">

        {/* Stat cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {loading ? (
            Array.from({ length: 4 }).map((_, i) => <SkeletonStat key={i} />)
          ) : (
            <>
              <motion.div variants={item}>
                <StatsCard icon={ScanLine} label="Plans This Month" value={stats?.analysesCount || 0} trend={12} color="#0A84FF" />
              </motion.div>
              <motion.div variants={item}>
                <StatsCard icon={Clock} label="Quotes Pending" value={stats?.pendingQuotes || 0} trend={-3} color="#ff9f0a" />
              </motion.div>
              <motion.div variants={item}>
                <StatsCard icon={Search} label="Components Detected" value={stats?.detectionsCount || 0} trend={18} color="#9333ea" />
              </motion.div>
              <motion.div variants={item}>
                <StatsCard icon={DollarSign} label="Avg Quote Value" value={stats?.avgQuoteValue || 0} prefix="$" trend={7} color="#34c759" />
              </motion.div>
            </>
          )}
        </div>

        {/* Main content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Recent quotes */}
          <motion.div variants={item} className="lg:col-span-2 bg-white/80 dark:bg-zinc-900/70 backdrop-blur-xl border border-white/60 dark:border-white/10 shadow-sm rounded-2xl">
            <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100 dark:border-white/10">
              <h2 className="text-lg font-semibold tracking-tight text-[#1c1c1e] dark:text-[#f5f5f7]">Recent Quotes</h2>
              <button onClick={() => router.push('/admin/quotes')} className="text-xs text-[#0A84FF] font-semibold hover:underline">
                View all
              </button>
            </div>

            {loading ? (
              <div className="px-6 py-2">
                {Array.from({ length: 4 }).map((_, i) => <SkeletonRow key={i} />)}
              </div>
            ) : quotes.length === 0 ? (
              <EmptyState
                icon={FileText}
                title="No quotes yet"
                description="Start by analysing a floor plan to generate your first quote"
                action={() => setShowOverlay(true)}
                actionLabel="New Analysis"
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="text-xs font-semibold tracking-[0.08em] uppercase text-[#8e8e93]">
                      {['Quote #', 'Client', 'Value', 'Status', 'Date', ''].map((h, i) => (
                        <th key={i} className={`px-4 py-3 text-left ${i === 0 ? 'pl-6' : ''} ${i === 5 ? 'pr-6' : ''}`}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {quotes.map((q, i) => (
                      <motion.tr
                        key={q.id}
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.05 }}
                        onClick={() => router.push(`/admin/quotes/${q.id}`)}
                        className="border-t border-gray-100 dark:border-white/5 hover:bg-gray-50/50 dark:hover:bg-white/5 cursor-pointer transition-colors"
                      >
                        <td className="px-4 py-3.5 pl-6 font-mono text-sm font-semibold text-[#0A84FF]">{q.id}</td>
                        <td className="px-4 py-3.5 text-sm text-[#1c1c1e] dark:text-[#f5f5f7] font-medium">{q.client_name || '—'}</td>
                        <td className="px-4 py-3.5 text-sm font-bold tabular-nums tracking-tight text-[#1c1c1e] dark:text-[#f5f5f7]">
                          ${Number(q.total || 0).toLocaleString('en-NZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td className="px-4 py-3.5"><StatusBadge status={q.status} /></td>
                        <td className="px-4 py-3.5 text-xs text-[#8e8e93]">{timeAgo(q.created_at)}</td>
                        <td className="px-4 py-3.5 pr-6">
                          <ChevronRight size={14} className="text-[#8e8e93]" strokeWidth={1.5} />
                        </td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </motion.div>

          {/* Quick actions */}
          <motion.div variants={item} className="bg-white/80 dark:bg-zinc-900/70 backdrop-blur-xl border border-white/60 dark:border-white/10 shadow-sm rounded-2xl">
            <div className="px-6 py-5 border-b border-gray-100 dark:border-white/10">
              <h2 className="text-lg font-semibold tracking-tight text-[#1c1c1e] dark:text-[#f5f5f7]">Quick Actions</h2>
            </div>
            <div className="p-5 space-y-3">
              <button
                onClick={() => setShowOverlay(true)}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-[#0A84FF]/10 hover:bg-[#0A84FF]/15 text-[#0A84FF] font-medium text-sm transition-colors"
              >
                <ScanLine size={18} strokeWidth={1.5} />
                Analyse Floor Plan
              </button>
              <button
                onClick={() => router.push('/admin/quotes')}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-gray-50 dark:bg-white/5 hover:bg-gray-100 dark:hover:bg-white/10 text-[#1c1c1e] dark:text-[#f5f5f7] font-medium text-sm transition-colors"
              >
                <FileText size={18} strokeWidth={1.5} />
                View Quotes
              </button>
              <button
                onClick={() => router.push('/admin/clients')}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-gray-50 dark:bg-white/5 hover:bg-gray-100 dark:hover:bg-white/10 text-[#1c1c1e] dark:text-[#f5f5f7] font-medium text-sm transition-colors"
              >
                <Search size={18} strokeWidth={1.5} />
                Invite Builder
              </button>
            </div>
          </motion.div>
        </div>

        {/* New Analysis CTA */}
        <motion.div variants={item}>
          <motion.button
            onClick={() => setShowOverlay(true)}
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.98 }}
            className="w-full py-5 bg-[#0A84FF] hover:bg-[#0070d6] text-white font-bold tracking-tight text-lg rounded-2xl transition-all shadow-lg shadow-[#0A84FF]/20 flex items-center justify-center gap-3"
          >
            <ScanLine size={24} strokeWidth={1.5} />
            New Analysis
          </motion.button>
        </motion.div>
      </motion.div>
    </>
  )
}
