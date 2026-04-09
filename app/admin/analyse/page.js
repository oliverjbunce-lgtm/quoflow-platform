'use client'
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import AnalysisOverlay from '@/components/AnalysisOverlay'

export default function AnalysePage() {
  const [showOverlay, setShowOverlay] = useState(false)

  return (
    <>
      <AnimatePresence>
        {showOverlay && <AnalysisOverlay onClose={() => setShowOverlay(false)} />}
      </AnimatePresence>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="space-y-6"
      >
        {/* Hero area */}
        <div className="bg-gradient-to-br from-[#0A84FF]/10 to-[#9333ea]/10 dark:from-[#0A84FF]/15 dark:to-[#9333ea]/15 border border-[#0A84FF]/20 rounded-3xl p-10 text-center">
          <motion.div
            animate={{ y: [0, -6, 0] }}
            transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
            className="w-20 h-20 rounded-3xl bg-[#0A84FF] flex items-center justify-center mx-auto mb-6 shadow-xl shadow-[#0A84FF]/30"
          >
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"/>
              <line x1="21" y1="21" x2="16.65" y2="16.65"/>
              <line x1="11" y1="8" x2="11" y2="14"/>
              <line x1="8" y1="11" x2="14" y2="11"/>
            </svg>
          </motion.div>

          <h1 className="text-4xl font-black tracking-[-0.02em] text-[#1c1c1e] dark:text-[#f5f5f7] mb-3">
            AI Floor Plan Analysis
          </h1>
          <p className="text-[#8e8e93] text-lg max-w-md mx-auto mb-8">
            Upload a floor plan PDF and our AI automatically detects all doors, sliders and components — generating an instant quote.
          </p>

          <motion.button
            onClick={() => setShowOverlay(true)}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="px-10 py-4 bg-[#0A84FF] hover:bg-[#0070d6] text-white font-black text-lg rounded-2xl transition-all shadow-lg shadow-[#0A84FF]/30"
          >
            Start New Analysis
          </motion.button>
        </div>

        {/* How it works */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { step: '01', icon: '📤', title: 'Upload PDF', desc: 'Drop your floor plan PDF. We support multi-page documents.' },
            { step: '02', icon: '🤖', title: 'AI Detects', desc: 'Our AI scans the plan and identifies all door types and components.' },
            { step: '03', icon: '💼', title: 'Instant Quote', desc: 'Review detections, adjust quantities, and send the quote.' },
          ].map(card => (
            <motion.div
              key={card.step}
              whileHover={{ scale: 1.01 }}
              className="bg-white/80 dark:bg-zinc-900/70 backdrop-blur-xl border border-white/60 dark:border-white/10 rounded-2xl p-6"
            >
              <div className="text-xs font-semibold tracking-[0.12em] uppercase text-[#0A84FF] mb-3">{card.step}</div>
              <div className="text-2xl mb-2">{card.icon}</div>
              <h3 className="font-black tracking-[-0.02em] text-[#1c1c1e] dark:text-[#f5f5f7] mb-1">{card.title}</h3>
              <p className="text-sm text-[#8e8e93]">{card.desc}</p>
            </motion.div>
          ))}
        </div>

        {/* Detectable components */}
        <div className="bg-white/80 dark:bg-zinc-900/70 backdrop-blur-xl border border-white/60 dark:border-white/10 rounded-2xl p-6">
          <h2 className="font-black tracking-[-0.02em] text-[#1c1c1e] dark:text-[#f5f5f7] mb-4">Detectable Components</h2>
          <div className="flex flex-wrap gap-2">
            {[
              ['#0A84FF', 'L/R Prehung Door'],
              ['#ec4899', 'Double Prehung Door'],
              ['#16a34a', 'Cavity Slider'],
              ['#9333ea', 'Bi-Folding Door'],
              ['#f97316', 'Barn Wall Slider'],
              ['#f59e0b', 'Wardrobe 2-Door'],
              ['#ef4444', 'Wardrobe 3/4-Door'],
            ].map(([colour, label]) => (
              <span key={label} className="flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-full bg-gray-100 dark:bg-zinc-800 text-[#1c1c1e] dark:text-[#f5f5f7]">
                <span className="w-2 h-2 rounded-full" style={{ background: colour }} />
                {label}
              </span>
            ))}
          </div>
        </div>
      </motion.div>
    </>
  )
}
