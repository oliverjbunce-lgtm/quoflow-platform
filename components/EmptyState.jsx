'use client'
import { motion } from 'framer-motion'

export default function EmptyState({ icon, title, description, action }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center py-20 text-center"
    >
      <div className="w-16 h-16 rounded-2xl bg-gray-100 dark:bg-zinc-800 flex items-center justify-center mb-4 text-3xl">
        {icon || '📋'}
      </div>
      <h3 className="text-lg font-black tracking-[-0.02em] text-[#1c1c1e] dark:text-[#f5f5f7] mb-2">{title}</h3>
      <p className="text-[#8e8e93] text-sm max-w-xs mb-6">{description}</p>
      {action && (
        <motion.button
          onClick={action.onClick}
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.98 }}
          className="px-5 py-2.5 bg-[#0A84FF] hover:bg-[#0070d6] text-white font-semibold rounded-xl transition-all text-sm"
        >
          {action.label}
        </motion.button>
      )}
    </motion.div>
  )
}
