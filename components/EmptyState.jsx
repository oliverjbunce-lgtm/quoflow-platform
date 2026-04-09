'use client'
import { motion } from 'framer-motion'

export default function EmptyState({ icon: Icon, title, description, action, actionLabel }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center py-20 text-center"
    >
      <div className="w-16 h-16 rounded-2xl bg-gray-100 dark:bg-white/5 flex items-center justify-center mb-4">
        {Icon && <Icon size={28} className="text-gray-400" strokeWidth={1.5} />}
      </div>
      <h3 className="text-lg font-semibold tracking-tight text-[#1c1c1e] dark:text-[#f5f5f7] mb-1">{title}</h3>
      <p className="text-sm text-[#8e8e93] max-w-sm mb-6">{description}</p>
      {action && (
        <motion.button
          onClick={action}
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.98 }}
          className="px-4 py-2 bg-[#0A84FF] text-white rounded-xl text-sm font-medium"
        >
          {actionLabel}
        </motion.button>
      )}
    </motion.div>
  )
}
