'use client'
import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useRouter } from 'next/navigation'
import StatusBadge from '@/components/StatusBadge'
import EmptyState from '@/components/EmptyState'
import { SkeletonRow } from '@/components/SkeletonCard'

const TABS = ['all', 'pending', 'sent', 'accepted', 'draft']

function timeAgo(ts) {
  if (!ts) return ''
  const diff = Math.floor(Date.now() / 1000) - Number(ts)
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}

export default function QuotesPage() {
  const [activeTab, setActiveTab] = useState('all')
  const [quotes, setQuotes] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const router = useRouter()

  useEffect(() => {
    setLoading(true)
    const params = new URLSearchParams()
    if (activeTab !== 'all') params.set('status', activeTab)
    if (search) params.set('search', search)

    fetch(`/api/quotes?${params}`)
      .then(r => r.json())
      .then(d => { setQuotes(d.quotes || []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [activeTab, search])

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="space-y-5">

      {/* Filter tabs + search */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex gap-1 p-1 bg-white/80 dark:bg-zinc-900/70 backdrop-blur-xl border border-white/60 dark:border-white/10 rounded-xl">
          {TABS.map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all capitalize ${
                activeTab === tab
                  ? 'bg-[#0A84FF] text-white shadow-sm'
                  : 'text-[#8e8e93] hover:text-[#1c1c1e] dark:hover:text-[#f5f5f7]'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        <div className="flex-1 min-w-[200px]">
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search quotes…"
            className="w-full px-4 py-2 rounded-xl border border-gray-200 dark:border-white/10 bg-white/80 dark:bg-zinc-800 text-sm text-[#1c1c1e] dark:text-[#f5f5f7] placeholder-[#8e8e93] focus:ring-2 focus:ring-[#0A84FF]/20 focus:border-[#0A84FF] outline-none"
          />
        </div>

        <motion.button
          onClick={() => router.push('/admin/analyse')}
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.98 }}
          className="px-4 py-2 bg-[#0A84FF] text-white font-semibold text-sm rounded-xl"
        >
          + New Quote
        </motion.button>
      </div>

      {/* Table */}
      <div className="bg-white/80 dark:bg-zinc-900/70 backdrop-blur-xl border border-white/60 dark:border-white/10 shadow-sm rounded-2xl overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-100 dark:border-white/10 text-xs font-semibold tracking-[0.08em] uppercase text-[#8e8e93]">
              {['Quote #', 'Client', 'Total', 'Status', 'Date', ''].map((h, i) => (
                <th key={i} className={`px-4 py-4 text-left ${i === 0 ? 'pl-6' : ''} ${i === 5 ? 'pr-6' : ''}`}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="border-t border-gray-100 dark:border-white/5">
                  <td className="px-4 py-4 pl-6" colSpan={6}><SkeletonRow /></td>
                </tr>
              ))
            ) : quotes.length === 0 ? (
              <tr>
                <td colSpan={6}>
                  <EmptyState
                    icon="📋"
                    title="No quotes found"
                    description={search ? `No quotes match "${search}"` : 'Create your first quote by analysing a floor plan'}
                    action={{ label: '+ New Analysis', onClick: () => router.push('/admin/analyse') }}
                  />
                </td>
              </tr>
            ) : (
              quotes.map((q, i) => (
                <motion.tr
                  key={q.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.04 }}
                  onClick={() => router.push(`/admin/quotes/${q.id}`)}
                  className="border-t border-gray-100 dark:border-white/5 hover:bg-gray-50/50 dark:hover:bg-white/5 cursor-pointer transition-colors"
                >
                  <td className="px-4 py-4 pl-6 font-mono text-sm font-semibold text-[#0A84FF]">{q.id}</td>
                  <td className="px-4 py-4 text-sm font-medium text-[#1c1c1e] dark:text-[#f5f5f7]">{q.client_name || '—'}</td>
                  <td className="px-4 py-4 text-sm font-black text-[#1c1c1e] dark:text-[#f5f5f7]">
                    ${Number(q.total || 0).toLocaleString('en-NZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td className="px-4 py-4"><StatusBadge status={q.status} /></td>
                  <td className="px-4 py-4 text-xs text-[#8e8e93]">{timeAgo(q.created_at)}</td>
                  <td className="px-4 py-4 pr-6">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#8e8e93" strokeWidth="2">
                      <polyline points="9 18 15 12 9 6"/>
                    </svg>
                  </td>
                </motion.tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </motion.div>
  )
}
