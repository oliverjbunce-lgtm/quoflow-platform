'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { FileText, Clock, CheckCircle, Send, AlertCircle } from 'lucide-react'
import { motion } from 'framer-motion'

const STATUS_CONFIG = {
  pending: { label: 'Pending', color: 'text-amber-600 bg-amber-50', icon: Clock },
  in_review: { label: 'In Review', color: 'text-blue-600 bg-blue-50', icon: AlertCircle },
  quoted: { label: 'Quoted', color: 'text-green-600 bg-green-50', icon: CheckCircle },
  sent: { label: 'Sent', color: 'text-gray-500 bg-gray-100', icon: Send },
}

export default function PlansPage() {
  const [plans, setPlans] = useState([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    fetch('/api/plans').then(r => r.json()).then(d => {
      setPlans(d.plans || [])
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#1c1c1e] dark:text-[#f5f5f7]">Plans</h1>
          <p className="text-sm text-gray-500 mt-1">Floor plans submitted for analysis and quoting</p>
        </div>
      </div>

      {loading && (
        <div className="space-y-3">
          {[1,2,3].map(i => <div key={i} className="h-20 rounded-2xl bg-gray-100 dark:bg-zinc-800 animate-pulse" />)}
        </div>
      )}

      {!loading && plans.length === 0 && (
        <div className="text-center py-24">
          <div className="w-16 h-16 rounded-2xl bg-gray-100 dark:bg-zinc-800 flex items-center justify-center mx-auto mb-4">
            <FileText size={28} className="text-gray-400" strokeWidth={1.5} />
          </div>
          <h3 className="text-lg font-semibold text-[#1c1c1e] dark:text-[#f5f5f7] mb-1">No plans yet</h3>
          <p className="text-sm text-gray-500">Plans appear here after analysis is complete</p>
        </div>
      )}

      <div className="space-y-3">
        {plans.map((plan, i) => {
          const status = STATUS_CONFIG[plan.review_status] || STATUS_CONFIG.pending
          const StatusIcon = status.icon
          const date = new Date(plan.created_at * 1000).toLocaleDateString('en-NZ', {
            day: 'numeric', month: 'short', year: 'numeric'
          })

          return (
            <motion.div
              key={plan.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              onClick={() => router.push(`/plan/${plan.id}`)}
              className="flex items-center gap-4 p-4 bg-white dark:bg-zinc-900 rounded-2xl border border-gray-200 dark:border-white/10 cursor-pointer hover:border-[#0A84FF]/30 hover:shadow-md transition-all group"
            >
              {/* File icon */}
              <div className="w-12 h-12 rounded-xl bg-[#0A84FF]/10 flex items-center justify-center flex-shrink-0">
                <FileText size={22} className="text-[#0A84FF]" strokeWidth={1.5} />
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm text-[#1c1c1e] dark:text-[#f5f5f7] truncate">
                  {plan.original_filename || plan.filename || plan.id}
                </p>
                <p className="text-xs text-gray-500 mt-0.5">
                  {plan.client_name
                    ? `${plan.client_name}${plan.client_company ? ` · ${plan.client_company}` : ''}`
                    : 'Unassigned'} · {date}
                </p>
              </div>

              {/* Detection count */}
              <div className="text-center px-4">
                <p className="text-xl font-bold tabular-nums text-[#1c1c1e] dark:text-[#f5f5f7]">{plan.detection_count || 0}</p>
                <p className="text-xs text-gray-400">detected</p>
              </div>

              {/* Status badge */}
              <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold ${status.color}`}>
                <StatusIcon size={12} strokeWidth={2} />
                {status.label}
              </div>

              {/* Arrow */}
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                className="text-gray-400 group-hover:text-[#0A84FF] transition-colors">
                <polyline points="9 18 15 12 9 6"/>
              </svg>
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}
