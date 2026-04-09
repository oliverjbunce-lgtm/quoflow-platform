'use client'
import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useRouter } from 'next/navigation'
import StatusBadge from '@/components/StatusBadge'
import EmptyState from '@/components/EmptyState'
import { FileText } from 'lucide-react'

function timeAgo(ts) {
  if (!ts) return ''
  const diff = Math.floor(Date.now() / 1000) - Number(ts)
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}

export default function PortalQuotesPage() {
  const [quotes, setQuotes] = useState([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState(null)
  const [accepting, setAccepting] = useState(null)
  const router = useRouter()

  useEffect(() => {
    fetch('/api/quotes').then(r => r.json()).then(d => { setQuotes(d.quotes || []); setLoading(false) }).catch(() => setLoading(false))
  }, [])

  async function acceptQuote(id) {
    setAccepting(id)
    await fetch(`/api/quotes/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'accepted' }),
    })
    setQuotes(prev => prev.map(q => q.id === id ? { ...q, status: 'accepted' } : q))
    setAccepting(null)
  }

  if (loading) return (
    <div className="space-y-4">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="h-20 skeleton rounded-2xl" />
      ))}
    </div>
  )

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
      <h1 className="text-3xl font-bold tracking-[-0.02em] text-[#1c1c1e] dark:text-[#f5f5f7]">My Quotes</h1>

      {quotes.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="No quotes yet"
          description="Submit a floor plan to receive your first quote"
          action={{ label: 'Submit a Plan', onClick: () => router.push('/portal/submit') }}
        />
      ) : (
        <div className="space-y-3">
          {quotes.map((q, i) => {
            const items = q.items || (q.items_json ? JSON.parse(q.items_json) : [])
            const isExpanded = expanded === q.id

            return (
              <motion.div
                key={q.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="bg-white/80 dark:bg-zinc-900/70 backdrop-blur-xl border border-white/60 dark:border-white/10 rounded-2xl overflow-hidden"
              >
                <div
                  className="flex items-center justify-between p-5 cursor-pointer"
                  onClick={() => setExpanded(isExpanded ? null : q.id)}
                >
                  <div className="flex items-center gap-3">
                    <span className="font-mono font-semibold text-[#0A84FF]">{q.id}</span>
                    <StatusBadge status={q.status} />
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="font-bold text-[#1c1c1e] dark:text-[#f5f5f7]">
                      ${Number(q.total || 0).toLocaleString('en-NZ', { minimumFractionDigits: 2 })}
                    </span>
                    <span className="text-xs text-[#8e8e93]">{timeAgo(q.created_at)}</span>
                    <svg
                      width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#8e8e93" strokeWidth="2"
                      style={{ transform: isExpanded ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s' }}
                    >
                      <polyline points="9 18 15 12 9 6"/>
                    </svg>
                  </div>
                </div>

                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    className="border-t border-gray-100 dark:border-white/10 p-5"
                  >
                    <div className="space-y-2 mb-4">
                      {items.map((item, idx) => (
                        <div key={idx} className="flex justify-between text-sm">
                          <span className="text-[#8e8e93]">{item.name} × {item.qty}</span>
                          <span className="font-semibold text-[#1c1c1e] dark:text-[#f5f5f7]">${Number(item.total || item.qty * item.unit_price).toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                    <div className="pt-3 border-t border-gray-100 dark:border-white/10 space-y-1">
                      <div className="flex justify-between text-sm">
                        <span className="text-[#8e8e93]">Subtotal</span>
                        <span>${Number(q.subtotal || 0).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-[#8e8e93]">GST 15%</span>
                        <span>${Number(q.gst || 0).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between font-bold text-base mt-2">
                        <span className="text-[#1c1c1e] dark:text-[#f5f5f7]">Total</span>
                        <span className="text-[#0A84FF]">${Number(q.total || 0).toFixed(2)} NZD</span>
                      </div>
                    </div>

                    {q.status === 'sent' && (
                      <motion.button
                        onClick={() => acceptQuote(q.id)}
                        disabled={accepting === q.id}
                        whileHover={{ scale: 1.01 }}
                        whileTap={{ scale: 0.98 }}
                        className="mt-4 w-full py-3 bg-[#34c759] hover:bg-green-600 text-white font-bold rounded-xl transition-all disabled:opacity-50"
                      >
                        {accepting === q.id ? 'Accepting…' : 'Accept Quote'}
                      </motion.button>
                    )}
                  </motion.div>
                )}
              </motion.div>
            )
          })}
        </div>
      )}
    </motion.div>
  )
}
