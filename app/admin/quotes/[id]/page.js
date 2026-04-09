'use client'
import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useRouter, useParams } from 'next/navigation'
import StatusBadge from '@/components/StatusBadge'
import SkeletonCardDefault, { SkeletonRow } from '@/components/SkeletonCard'
const SkeletonCard = SkeletonCardDefault
import { DEFAULT_UNIT_PRICES, DETECTION_LABELS, DETECTION_COLOURS } from '@/lib/mockData'
import { Download } from 'lucide-react'

function normalise(name) {
  return DETECTION_LABELS[name] || name?.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) || 'Unknown'
}

export default function QuoteDetailPage() {
  const { id } = useParams()
  const [quote, setQuote] = useState(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('quote')
  const [saving, setSaving] = useState(false)
  const [sending, setSending] = useState(false)
  const [status, setStatus] = useState('')
  const router = useRouter()

  useEffect(() => {
    fetch(`/api/quotes/${id}`)
      .then(r => r.json())
      .then(d => { setQuote(d.quote); setLoading(false) })
      .catch(() => setLoading(false))
  }, [id])

  async function handleStatusChange(newStatus) {
    setSaving(true)
    await fetch(`/api/quotes/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    })
    setQuote(q => ({ ...q, status: newStatus }))
    setSaving(false)
  }

  async function handleSend() {
    setSending(true)
    await fetch(`/api/quotes/${id}/approve`, { method: 'POST' })
    setQuote(q => ({ ...q, status: 'sent' }))
    setSending(false)
  }

  async function createOrder() {
    const res = await fetch('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ quoteId: id }),
    })
    if (res.ok) router.push('/admin/orders')
  }

  if (loading) {
    return <div className="p-6"><SkeletonCard rows={8} /></div>
  }

  if (!quote) {
    return (
      <div className="text-center py-20">
        <p className="text-[#8e8e93]">Quote not found</p>
        <button onClick={() => router.back()} className="mt-4 text-[#0A84FF] font-semibold">← Back</button>
      </div>
    )
  }

  const items = quote.items || (quote.items_json ? JSON.parse(quote.items_json) : [])
  const subtotal = Number(quote.subtotal || 0)
  const gst = Number(quote.gst || 0)
  const total = Number(quote.total || 0)

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="space-y-5">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={() => router.back()} className="text-[#8e8e93] hover:text-[#1c1c1e] dark:hover:text-[#f5f5f7] transition-colors">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="15 18 9 12 15 6"/>
            </svg>
          </button>
          <div>
            <h1 className="text-2xl font-bold tracking-[-0.02em] text-[#1c1c1e] dark:text-[#f5f5f7]">{quote.id}</h1>
            <p className="text-sm text-[#8e8e93]">{quote.client_name || 'No client'}</p>
          </div>
          <StatusBadge status={quote.status} size="lg" />
        </div>

        <div className="flex gap-2">
          <a
            href={`/api/quotes/${id}/pdf`}
            target="_blank"
            className="flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-200 dark:border-white/10 text-sm font-medium hover:bg-gray-50 dark:hover:bg-white/5 transition-colors text-[#1c1c1e] dark:text-[#f5f5f7]"
          >
            <Download size={16} strokeWidth={1.5} /> Download PDF
          </a>
          {quote.status === 'draft' && (
            <motion.button
              onClick={handleSend}
              disabled={sending}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
              className="px-4 py-2 bg-[#0A84FF] hover:bg-[#0070d6] text-white font-semibold text-sm rounded-xl transition-all disabled:opacity-50"
            >
              {sending ? 'Sending…' : 'Send Quote'}
            </motion.button>
          )}
          {quote.status === 'sent' && (
            <>
              <motion.button onClick={() => handleStatusChange('accepted')} whileHover={{ scale: 1.01 }} className="px-4 py-2 bg-[#34c759] text-white font-semibold text-sm rounded-xl">
                Mark Accepted
              </motion.button>
              <motion.button onClick={() => handleStatusChange('declined')} whileHover={{ scale: 1.01 }} className="px-4 py-2 bg-red-100 dark:bg-red-900/30 text-[#ff3b30] font-semibold text-sm rounded-xl">
                Mark Declined
              </motion.button>
            </>
          )}
          {quote.status === 'accepted' && (
            <motion.button onClick={createOrder} whileHover={{ scale: 1.01 }} className="px-4 py-2 bg-[#9333ea] text-white font-semibold text-sm rounded-xl">
              Create Order
            </motion.button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white/80 dark:bg-zinc-900/70 backdrop-blur-xl border border-white/60 dark:border-white/10 rounded-2xl">
          {/* Tabs */}
          <div className="flex border-b border-gray-100 dark:border-white/10 px-6">
            {['quote', 'detections', 'notes'].map(t => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`py-4 mr-6 text-sm font-semibold capitalize border-b-2 transition-colors ${
                  tab === t ? 'border-[#0A84FF] text-[#0A84FF]' : 'border-transparent text-[#8e8e93] hover:text-[#1c1c1e] dark:hover:text-[#f5f5f7]'
                }`}
              >
                {t}
              </button>
            ))}
          </div>

          <div className="p-6">
            {tab === 'quote' && (
              <div className="space-y-3">
                {items.length === 0 ? (
                  <p className="text-[#8e8e93] text-sm">No items in this quote</p>
                ) : items.map((item, i) => (
                  <div key={i} className="flex items-center gap-4 p-3 bg-gray-50 dark:bg-zinc-800 rounded-xl">
                    <div className="flex-1">
                      <p className="font-semibold text-[#1c1c1e] dark:text-[#f5f5f7]">{item.name}</p>
                    </div>
                    <span className="text-sm text-[#8e8e93]">×{item.qty}</span>
                    <span className="text-sm text-[#8e8e93]">${Number(item.unit_price || 0).toFixed(2)}/ea</span>
                    <span className="font-bold text-[#1c1c1e] dark:text-[#f5f5f7]">${Number(item.total || item.qty * item.unit_price).toFixed(2)}</span>
                  </div>
                ))}
                <div className="pt-4 border-t border-gray-100 dark:border-white/10 space-y-2">
                  <div className="flex justify-between text-sm text-[#8e8e93]">
                    <span>Subtotal</span><span className="text-[#1c1c1e] dark:text-[#f5f5f7]">${subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm text-[#8e8e93]">
                    <span>GST 15%</span><span className="text-[#1c1c1e] dark:text-[#f5f5f7]">${gst.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-xl font-bold">
                    <span className="text-[#1c1c1e] dark:text-[#f5f5f7]">Total NZD</span>
                    <span className="text-[#0A84FF]">${total.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            )}

            {tab === 'detections' && (
              <div className="space-y-2">
                {(quote.detections || []).length === 0 ? (
                  <p className="text-[#8e8e93] text-sm">No detection data available</p>
                ) : (quote.detections || []).map((d, i) => (
                  <div key={i} className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-zinc-800 rounded-xl">
                    <div className="w-3 h-3 rounded-full" style={{ background: DETECTION_COLOURS[d.class_name] || '#0A84FF' }} />
                    <span className="text-sm font-medium text-[#1c1c1e] dark:text-[#f5f5f7] flex-1">{normalise(d.class_name)}</span>
                    <span className="text-xs text-[#8e8e93]">{Math.round((d.confidence || 0.9) * 100)}%</span>
                  </div>
                ))}
              </div>
            )}

            {tab === 'notes' && (
              <div>
                <p className="text-sm text-[#1c1c1e] dark:text-[#f5f5f7] whitespace-pre-wrap">
                  {quote.notes || <span className="text-[#8e8e93]">No notes</span>}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Summary sidebar */}
        <div className="space-y-4">
          <div className="bg-white/80 dark:bg-zinc-900/70 backdrop-blur-xl border border-white/60 dark:border-white/10 rounded-2xl p-5">
            <h3 className="font-bold text-sm tracking-[-0.01em] text-[#1c1c1e] dark:text-[#f5f5f7] mb-4">Quote Summary</h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-[#8e8e93]">Quote ID</span>
                <span className="font-mono font-semibold text-[#0A84FF]">{quote.id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#8e8e93]">Client</span>
                <span className="font-semibold text-[#1c1c1e] dark:text-[#f5f5f7]">{quote.client_name || '—'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#8e8e93]">Status</span>
                <StatusBadge status={quote.status} size="sm" />
              </div>
              <div className="flex justify-between">
                <span className="text-[#8e8e93]">Items</span>
                <span className="font-semibold text-[#1c1c1e] dark:text-[#f5f5f7]">{items.length}</span>
              </div>
              <div className="flex justify-between pt-2 border-t border-gray-100 dark:border-white/10">
                <span className="font-bold text-[#1c1c1e] dark:text-[#f5f5f7]">Total</span>
                <span className="font-bold text-[#0A84FF] text-lg">${total.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  )
}
