'use client'
import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import StatusBadge from '@/components/StatusBadge'
import { FileText, Package } from 'lucide-react'

function getGreeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

function timeAgo(ts) {
  if (!ts) return ''
  const diff = Math.floor(Date.now() / 1000) - Number(ts)
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}

export default function PortalDashboard() {
  const [user, setUser] = useState(null)
  const [quotes, setQuotes] = useState([])
  const [orders, setOrders] = useState([])
  const router = useRouter()

  useEffect(() => {
    fetch('/api/auth/me').then(r => r.json()).then(d => setUser(d.user)).catch(() => {})
    fetch('/api/quotes').then(r => r.json()).then(d => setQuotes(d.quotes?.slice(0, 3) || [])).catch(() => {})
    fetch('/api/orders').then(r => r.json()).then(d => setOrders(d.orders?.slice(0, 3) || [])).catch(() => {})
  }, [])

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">

      {/* Welcome */}
      <div>
        <h1 className="text-3xl font-bold tracking-[-0.02em] text-[#1c1c1e] dark:text-[#f5f5f7]">
          {getGreeting()}{user?.name ? `, ${user.name.split(' ')[0]}` : ''}
        </h1>
        <p className="text-[#8e8e93] mt-1">Here's what's happening with your projects</p>
      </div>

      {/* Action cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <motion.div
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => router.push('/portal/submit')}
          className="bg-gradient-to-br from-[#0A84FF] to-[#0070d6] rounded-2xl p-8 cursor-pointer shadow-lg shadow-[#0A84FF]/25 text-white"
        >
          <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center mb-4">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
            </svg>
          </div>
          <h3 className="text-xl font-bold tracking-[-0.02em] mb-1">Submit a Floor Plan</h3>
          <p className="text-white/70 text-sm">Upload your plan and get an instant quote</p>
        </motion.div>

        <motion.div
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => router.push('/portal/quotes')}
          className="bg-white/80 dark:bg-zinc-900/70 backdrop-blur-xl border border-white/60 dark:border-white/10 rounded-2xl p-8 cursor-pointer"
        >
          <div className="w-12 h-12 bg-amber-50 dark:bg-amber-900/30 rounded-2xl flex items-center justify-center mb-4">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#ff9f0a" strokeWidth="1.5">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
              <line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>
            </svg>
          </div>
          <h3 className="text-xl font-bold tracking-[-0.02em] text-[#1c1c1e] dark:text-[#f5f5f7] mb-1">View My Quotes</h3>
          <p className="text-[#8e8e93] text-sm">{quotes.length} quote{quotes.length !== 1 ? 's' : ''} on file</p>
        </motion.div>
      </div>

      {/* Recent activity */}
      {(quotes.length > 0 || orders.length > 0) && (
        <div className="space-y-4">
          <h2 className="font-bold tracking-[-0.02em] text-[#1c1c1e] dark:text-[#f5f5f7]">Recent Activity</h2>

          <div className="bg-white/80 dark:bg-zinc-900/70 backdrop-blur-xl border border-white/60 dark:border-white/10 rounded-2xl divide-y divide-gray-100 dark:divide-white/5">
            {[...quotes.map(q => ({ ...q, type: 'quote' })), ...orders.map(o => ({ ...o, type: 'order' }))].slice(0, 4).map((item, i) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: i * 0.05 }}
                className="flex items-center justify-between p-4"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                    item.type === 'quote' ? 'bg-amber-50 dark:bg-amber-900/30' : 'bg-purple-50 dark:bg-purple-900/30'
                  }`}>
                    {item.type === 'quote' ? <FileText size={16} strokeWidth={1.5} className="text-amber-500" /> : <Package size={16} strokeWidth={1.5} className="text-purple-500" />}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-[#1c1c1e] dark:text-[#f5f5f7]">
                      {item.type === 'quote' ? `Quote ${item.id}` : `Order ${item.id?.slice(0, 8)}`}
                    </p>
                    <p className="text-xs text-[#8e8e93]">{timeAgo(item.created_at)}</p>
                  </div>
                </div>
                <StatusBadge status={item.status} size="sm" />
              </motion.div>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  )
}
