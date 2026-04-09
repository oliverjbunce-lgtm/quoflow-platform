'use client'
import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useRouter } from 'next/navigation'
import StatusBadge from '@/components/StatusBadge'
import EmptyState from '@/components/EmptyState'
import { Package } from 'lucide-react'

const ORDER_STEPS = ['pending', 'processing', 'shipped', 'delivered']

function OrderProgress({ status }) {
  const step = ORDER_STEPS.indexOf(status)
  return (
    <div className="flex items-center gap-1 mt-3">
      {ORDER_STEPS.map((s, i) => (
        <div key={s} className="flex items-center gap-1 flex-1">
          <div className={`flex-1 h-1.5 rounded-full transition-all ${i <= step ? 'bg-[#0A84FF]' : 'bg-gray-100 dark:bg-zinc-700'}`} />
          {i === ORDER_STEPS.length - 1 && (
            <div className={`w-3 h-3 rounded-full flex-shrink-0 ${i <= step ? 'bg-[#0A84FF]' : 'bg-gray-200 dark:bg-zinc-700'}`} />
          )}
        </div>
      ))}
    </div>
  )
}

export default function PortalOrdersPage() {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    fetch('/api/orders').then(r => r.json()).then(d => { setOrders(d.orders || []); setLoading(false) }).catch(() => setLoading(false))
  }, [])

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
      <h1 className="text-3xl font-bold tracking-[-0.02em] text-[#1c1c1e] dark:text-[#f5f5f7]">My Orders</h1>

      {orders.length === 0 ? (
        <EmptyState
          icon={Package}
          title="No orders yet"
          description="Accept a quote to create your first order"
          action={{ label: 'View Quotes', onClick: () => router.push('/portal/quotes') }}
        />
      ) : (
        <div className="space-y-3">
          {orders.map((o, i) => (
            <motion.div
              key={o.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="bg-white/80 dark:bg-zinc-900/70 backdrop-blur-xl border border-white/60 dark:border-white/10 rounded-2xl p-5"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="font-mono text-sm font-semibold text-[#8e8e93]">{o.id?.slice(0, 8).toUpperCase()}</span>
                <StatusBadge status={o.status} />
              </div>
              {o.quote_id && (
                <p className="text-sm text-[#8e8e93]">From quote <span className="text-[#0A84FF] font-semibold">{o.quote_id}</span></p>
              )}
              {!['cancelled', 'delivered'].includes(o.status) && (
                <OrderProgress status={o.status} />
              )}
              <div className="mt-3 flex gap-2 text-xs text-[#8e8e93]">
                {ORDER_STEPS.map((s, idx) => (
                  <span key={s} className={idx === ORDER_STEPS.indexOf(o.status) ? 'font-semibold text-[#0A84FF]' : ''}>
                    {idx < ORDER_STEPS.indexOf(o.status) ? '✓ ' : ''}{s.charAt(0).toUpperCase() + s.slice(1)}
                    {idx < ORDER_STEPS.length - 1 && ' →'}
                  </span>
                ))}
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </motion.div>
  )
}
