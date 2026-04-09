'use client'
import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useRouter } from 'next/navigation'
import StatusBadge from '@/components/StatusBadge'
import EmptyState from '@/components/EmptyState'
import { SkeletonRow } from '@/components/SkeletonCard'

function timeAgo(ts) {
  if (!ts) return ''
  const diff = Math.floor(Date.now() / 1000) - Number(ts)
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}

export default function OrdersPage() {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    fetch('/api/orders')
      .then(r => r.json())
      .then(d => { setOrders(d.orders || []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  const statusUpdate = async (orderId, status) => {
    await fetch(`/api/orders`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: orderId, status }),
    }).catch(() => {})
    setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status } : o))
  }

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">

      <div className="bg-white/80 dark:bg-zinc-900/70 backdrop-blur-xl border border-white/60 dark:border-white/10 rounded-2xl overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-100 dark:border-white/10 flex items-center justify-between">
          <h2 className="font-black tracking-[-0.02em] text-[#1c1c1e] dark:text-[#f5f5f7]">All Orders</h2>
          <span className="text-xs text-[#8e8e93]">{orders.length} orders</span>
        </div>

        <table className="w-full">
          <thead>
            <tr className="text-xs font-semibold tracking-[0.08em] uppercase text-[#8e8e93] border-b border-gray-100 dark:border-white/10">
              {['Order #', 'Quote', 'Status', 'Date', 'Actions'].map((h, i) => (
                <th key={i} className={`px-4 py-4 text-left ${i === 0 ? 'pl-6' : ''}`}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <tr key={i}><td colSpan={5} className="px-4 py-3 pl-6"><SkeletonRow /></td></tr>
              ))
            ) : orders.length === 0 ? (
              <tr><td colSpan={5}>
                <EmptyState
                  icon="📦"
                  title="No orders yet"
                  description="Orders are created when quotes are accepted"
                  action={{ label: 'View Quotes', onClick: () => router.push('/admin/quotes') }}
                />
              </td></tr>
            ) : orders.map((o, i) => (
              <motion.tr
                key={o.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: i * 0.04 }}
                className="border-t border-gray-100 dark:border-white/5 hover:bg-gray-50/50 dark:hover:bg-white/5 transition-colors"
              >
                <td className="px-4 py-4 pl-6 font-mono text-sm font-semibold text-[#8e8e93]">
                  {o.id.slice(0, 8).toUpperCase()}
                </td>
                <td className="px-4 py-4 text-sm font-semibold text-[#0A84FF]">{o.quote_id || '—'}</td>
                <td className="px-4 py-4"><StatusBadge status={o.status} /></td>
                <td className="px-4 py-4 text-xs text-[#8e8e93]">{timeAgo(o.created_at)}</td>
                <td className="px-4 py-4">
                  <select
                    defaultValue={o.status}
                    onChange={e => statusUpdate(o.id, e.target.value)}
                    className="text-xs rounded-lg border border-gray-200 dark:border-white/10 bg-transparent text-[#1c1c1e] dark:text-[#f5f5f7] px-2 py-1"
                  >
                    {['pending', 'processing', 'shipped', 'delivered', 'cancelled'].map(s => (
                      <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                    ))}
                  </select>
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>
    </motion.div>
  )
}
