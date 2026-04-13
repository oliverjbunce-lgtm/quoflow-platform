'use client'

import { useState } from 'react'

/**
 * Modal for assigning or creating a client.
 *
 * Props:
 *   clients           — array of { id, name, company }
 *   onAssign(client)  — called when an existing client is selected
 *   onAddNew({ name, company }) — called when user wants to create + assign a new client
 *   onClose           — cancel
 */
export default function ClientModal({ clients, onAssign, onAddNew, onClose }) {
  const [search, setSearch] = useState('')
  const [newName, setNewName] = useState('')
  const [newCompany, setNewCompany] = useState('')

  const filtered = clients.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      (c.company || '').toLowerCase().includes(search.toLowerCase())
  )

  const handleAddNew = () => {
    if (!newName.trim()) return
    onAddNew({ name: newName.trim(), company: newCompany.trim() })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl w-96 overflow-hidden">
        <div className="p-4 border-b border-gray-100 dark:border-white/5">
          <h3 className="font-semibold text-[#1c1c1e] dark:text-[#f5f5f7]">Assign Client</h3>
          <input
            placeholder="Search clients…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="mt-2 w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-white/10 text-sm bg-transparent focus:outline-none focus:border-[#0A84FF]"
          />
        </div>

        <div className="max-h-60 overflow-y-auto">
          {filtered.map((c) => (
            <button
              key={c.id}
              onClick={() => onAssign(c)}
              className="w-full text-left px-4 py-3 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors border-b border-gray-50 dark:border-white/5"
            >
              <p className="text-sm font-medium text-[#1c1c1e] dark:text-[#f5f5f7]">{c.name}</p>
              {c.company && <p className="text-xs text-gray-400">{c.company}</p>}
            </button>
          ))}
        </div>

        <div className="p-4 border-t border-gray-100 dark:border-white/5 space-y-2">
          <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide">Add new client</p>
          <input
            placeholder="Name"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-white/10 text-sm bg-transparent focus:outline-none focus:border-[#0A84FF]"
          />
          <input
            placeholder="Company (optional)"
            value={newCompany}
            onChange={(e) => setNewCompany(e.target.value)}
            className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-white/10 text-sm bg-transparent focus:outline-none focus:border-[#0A84FF]"
          />
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="flex-1 py-2 rounded-xl border border-gray-200 dark:border-white/10 text-sm font-medium hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleAddNew}
              disabled={!newName.trim()}
              className="flex-1 py-2 rounded-xl bg-[#0A84FF] text-white text-sm font-medium hover:bg-[#0070d6] disabled:opacity-40 transition-colors"
            >
              Add & Assign
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
