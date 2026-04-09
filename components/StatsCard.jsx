'use client'
import { motion, useMotionValue, useTransform, animate } from 'framer-motion'
import { useEffect } from 'react'

function CountingNumber({ value, prefix = '', suffix = '' }) {
  const count = useMotionValue(0)

  useEffect(() => {
    const controls = animate(count, value, {
      duration: 1.2,
      ease: [0.16, 1, 0.3, 1],
    })
    return controls.stop
  }, [value])

  return (
    <motion.span className="tabular-nums">
      {prefix}
      <motion.span>{useTransform(count, v => Math.round(v).toLocaleString())}</motion.span>
      {suffix}
    </motion.span>
  )
}

export default function StatsCard({ icon: Icon, label, value, trend, prefix = '', suffix = '', color = '#0A84FF' }) {
  const isPositive = trend > 0
  const isNegative = trend < 0

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.01 }}
      className="bg-white/80 dark:bg-zinc-900/70 backdrop-blur-xl border border-white/60 dark:border-white/10 shadow-sm rounded-2xl p-6 cursor-default"
    >
      <div className="flex items-start justify-between mb-4">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center"
          style={{ background: color }}
        >
          {Icon && <Icon size={20} color="white" strokeWidth={1.5} />}
        </div>
        {trend !== undefined && (
          <span className={`text-xs font-semibold px-2 py-1 rounded-lg ${
            isPositive ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' :
            isNegative ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400' :
            'bg-gray-100 dark:bg-zinc-800 text-gray-500'
          }`}>
            {isPositive ? '↑' : isNegative ? '↓' : '→'} {Math.abs(trend)}%
          </span>
        )}
      </div>

      <div className="text-3xl font-bold tabular-nums tracking-tight text-[#1c1c1e] dark:text-[#f5f5f7] mb-1">
        <CountingNumber value={Number(value) || 0} prefix={prefix} suffix={suffix} />
      </div>
      <div className="text-xs font-semibold tracking-[0.12em] uppercase text-[#8e8e93]">
        {label}
      </div>
    </motion.div>
  )
}
