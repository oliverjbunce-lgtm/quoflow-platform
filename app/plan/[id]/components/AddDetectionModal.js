'use client'

import { useState } from 'react'
import { DOOR_TYPES } from './constants'

/**
 * Modal for picking a door type when drawing a new detection box.
 *
 * Props:
 *   position  — normalised bbox [x1, y1, x2, y2] (for display reference)
 *   onAdd(type) — called with the selected door type string; parent handles API call
 *   onClose   — cancel
 */
export default function AddDetectionModal({ position, onAdd, onClose }) {
  const [selected, setSelected] = useState('')

  const handleAdd = () => {
    if (!selected) return
    onAdd(selected)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl w-80 overflow-hidden">
        <div className="p-4 border-b border-gray-100 dark:border-white/5">
          <h3 className="font-semibold text-[#1c1c1e] dark:text-[#f5f5f7]">Select Door Type</h3>
          <p className="text-xs text-gray-400 mt-0.5">Choose the type for this detection</p>
        </div>

        <div className="p-3 max-h-72 overflow-y-auto space-y-1">
          {DOOR_TYPES.map((t) => (
            <button
              key={t}
              onClick={() => setSelected(t)}
              className={`w-full text-left px-3 py-2 rounded-xl text-sm transition-colors ${
                selected === t
                  ? 'bg-[#0A84FF] text-white font-medium'
                  : 'text-[#1c1c1e] dark:text-[#f5f5f7] hover:bg-gray-100 dark:hover:bg-white/5'
              }`}
            >
              {t.replace(/_/g, ' ')}
            </button>
          ))}
        </div>

        <div className="p-4 border-t border-gray-100 dark:border-white/5 flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 py-2 rounded-xl border border-gray-200 dark:border-white/10 text-sm font-medium hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleAdd}
            disabled={!selected}
            className="flex-1 py-2 rounded-xl bg-[#0A84FF] text-white text-sm font-medium hover:bg-[#0070d6] disabled:opacity-40 transition-colors"
          >
            Add Detection
          </button>
        </div>
      </div>
    </div>
  )
}
