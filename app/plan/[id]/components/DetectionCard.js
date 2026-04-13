'use client'

import { Trash2, ChevronRight } from 'lucide-react'
import { DOOR_TYPES, getColour } from './constants'

const SPEC_FIELDS = [
  ['Width (mm)', 'width_mm', ['600', '700', '760', '810', '860', '910', 'Custom']],
  ['Height (mm)', 'height_mm', ['2040', '2100', 'Custom']],
  ['Core', 'core', ['Hollow Core', 'Solid Core', 'Fire Rated (FD30)']],
  ['Finish', 'finish', ['Raw', 'Primed', 'Pre-finished White']],
  ['Frame', 'frame', ['LJ&P Standard', 'Rebate Only', 'No Frame']],
  ['Handing', 'handing', ['Left Hand', 'Right Hand', 'N/A']],
]

export default function DetectionCard({ det, isSelected, onClick, onUpdate, onDelete }) {
  const color = getColour(det.corrected_class || det.class_name)
  const specs = det.specs || {}

  return (
    <div
      className={`mx-3 my-1.5 rounded-xl border transition-all cursor-pointer ${
        isSelected
          ? 'border-[#0A84FF] bg-blue-50/50 dark:bg-blue-950/20 shadow-md'
          : 'border-gray-200 dark:border-white/10 bg-white dark:bg-zinc-800/50 hover:border-gray-300'
      }`}
    >
      {/* Header row */}
      <div className="flex items-center gap-2.5 p-3" onClick={onClick}>
        <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-[#1c1c1e] dark:text-[#f5f5f7] truncate">
            {(det.corrected_class || det.class_name || '').replace(/_/g, ' ')}
          </p>
          {det.confidence != null && (
            <p className="text-xs text-gray-400">{Math.round(det.confidence * 100)}% confidence</p>
          )}
        </div>
        <button
          onClick={(e) => { e.stopPropagation(); onDelete() }}
          className="p-1 text-gray-400 hover:text-red-500 transition-colors"
        >
          <Trash2 size={14} strokeWidth={1.5} />
        </button>
        <ChevronRight
          size={14}
          className={`text-gray-400 transition-transform ${isSelected ? 'rotate-90' : ''}`}
          strokeWidth={1.5}
        />
      </div>

      {/* Expanded spec fields */}
      {isSelected && (
        <div className="overflow-hidden border-t border-gray-100 dark:border-white/5">
          <div className="p-3 space-y-3">
            {/* Door type */}
            <div>
              <label className="text-xs text-gray-400 block mb-1">Door Type</label>
              <select
                value={det.corrected_class || det.class_name || ''}
                onChange={(e) => onUpdate({ corrected_class: e.target.value })}
                onClick={(e) => e.stopPropagation()}
                className="w-full text-sm border border-gray-200 dark:border-white/10 rounded-lg px-2 py-1.5 bg-white dark:bg-zinc-800 text-[#1c1c1e] dark:text-[#f5f5f7]"
              >
                {DOOR_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t.replace(/_/g, ' ')}
                  </option>
                ))}
              </select>
            </div>

            {/* Interior/Exterior */}
            <div>
              <label className="text-xs text-gray-400 block mb-1">Location</label>
              <div className="flex gap-2">
                {['Interior', 'Exterior'].map((loc) => (
                  <button
                    key={loc}
                    onClick={(e) => {
                      e.stopPropagation()
                      onUpdate({ specs: { ...specs, location: loc } })
                    }}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      (specs.location || 'Interior') === loc
                        ? 'bg-[#0A84FF] text-white'
                        : 'bg-gray-100 dark:bg-zinc-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200'
                    }`}
                  >
                    {loc}
                  </button>
                ))}
              </div>
            </div>

            {/* Spec grid */}
            <div className="grid grid-cols-2 gap-2">
              {SPEC_FIELDS.map(([label, field, options]) => (
                <div key={field}>
                  <label className="text-xs text-gray-400 block mb-1">{label}</label>
                  <select
                    value={specs[field] || ''}
                    onChange={(e) => {
                      e.stopPropagation()
                      onUpdate({ specs: { ...specs, [field]: e.target.value } })
                    }}
                    onClick={(e) => e.stopPropagation()}
                    className="w-full text-xs border border-gray-200 dark:border-white/10 rounded-lg px-2 py-1.5 bg-white dark:bg-zinc-800"
                  >
                    <option value="">— select —</option>
                    {options.map((o) => (
                      <option key={o} value={o}>
                        {o}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>

            {/* Delete button */}
            <button
              onClick={(e) => { e.stopPropagation(); onDelete() }}
              className="w-full py-1.5 rounded-lg text-xs font-medium text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors flex items-center justify-center gap-1.5"
            >
              <Trash2 size={12} strokeWidth={1.5} /> Remove detection
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
