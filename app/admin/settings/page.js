'use client'
import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { DEFAULT_UNIT_PRICES } from '@/lib/mockData'

function Toggle({ value, onChange }) {
  return (
    <motion.button
      onClick={() => onChange(!value)}
      className={`relative w-11 h-6 rounded-full transition-colors ${value ? 'bg-[#0A84FF]' : 'bg-gray-200 dark:bg-zinc-700'}`}
    >
      <motion.div
        animate={{ x: value ? 20 : 2 }}
        transition={{ type: 'spring', stiffness: 400, damping: 25 }}
        className="absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm"
      />
    </motion.button>
  )
}

export default function SettingsPage() {
  const [company, setCompany] = useState({
    name: 'Demo Company', email: 'admin@quoflow.co.nz',
    phone: '+64 9 123 4567', address: 'Auckland, New Zealand',
    timezone: 'Pacific/Auckland', currency: 'NZD',
  })
  const [pricing, setPricing] = useState(DEFAULT_UNIT_PRICES)
  const [notifications, setNotifications] = useState({
    new_quote: true, analysis_complete: true, builder_signup: false, quote_accepted: true,
  })
  const [users, setUsers] = useState([])
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    fetch('/api/auth/me').then(r => r.json()).then(d => {
      if (d.tenant?.settings_json) {
        try {
          const s = typeof d.tenant.settings_json === 'string' ? JSON.parse(d.tenant.settings_json) : d.tenant.settings_json
          if (s.pricing) setPricing(p => ({ ...p, ...s.pricing }))
          setCompany(c => ({ ...c, name: d.tenant.name || c.name }))
        } catch {}
      }
    }).catch(() => {})

    fetch('/api/clients').then(r => r.json()).then(d => setUsers(d.clients || [])).catch(() => {})
  }, [])

  async function handleSave() {
    setSaving(true)
    await new Promise(r => setTimeout(r, 800))
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="space-y-6 max-w-3xl">

      {/* Company */}
      <div className="bg-white/80 dark:bg-zinc-900/70 backdrop-blur-xl border border-white/60 dark:border-white/10 rounded-2xl p-6">
        <h2 className="font-black tracking-[-0.02em] text-[#1c1c1e] dark:text-[#f5f5f7] mb-5">Company Details</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[
            { key: 'name', label: 'Business Name' },
            { key: 'email', label: 'Business Email' },
            { key: 'phone', label: 'Phone' },
            { key: 'address', label: 'Address' },
          ].map(field => (
            <div key={field.key}>
              <label className="text-xs font-semibold tracking-[0.08em] uppercase text-[#8e8e93] block mb-1.5">{field.label}</label>
              <input
                value={company[field.key] || ''}
                onChange={e => setCompany(c => ({ ...c, [field.key]: e.target.value }))}
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-zinc-800 text-[#1c1c1e] dark:text-[#f5f5f7] text-sm focus:ring-2 focus:ring-[#0A84FF]/20 focus:border-[#0A84FF] outline-none"
              />
            </div>
          ))}
          <div>
            <label className="text-xs font-semibold tracking-[0.08em] uppercase text-[#8e8e93] block mb-1.5">Currency</label>
            <select
              value={company.currency}
              onChange={e => setCompany(c => ({ ...c, currency: e.target.value }))}
              className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-zinc-800 text-[#1c1c1e] dark:text-[#f5f5f7] text-sm outline-none"
            >
              <option value="NZD">NZD — New Zealand Dollar</option>
              <option value="AUD">AUD — Australian Dollar</option>
              <option value="USD">USD — US Dollar</option>
            </select>
          </div>
        </div>
      </div>

      {/* Default pricing */}
      <div className="bg-white/80 dark:bg-zinc-900/70 backdrop-blur-xl border border-white/60 dark:border-white/10 rounded-2xl p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-black tracking-[-0.02em] text-[#1c1c1e] dark:text-[#f5f5f7]">Default Pricing</h2>
          <button
            onClick={() => setPricing(DEFAULT_UNIT_PRICES)}
            className="text-xs text-[#8e8e93] hover:text-[#ff3b30] font-semibold transition-colors"
          >
            Reset to defaults
          </button>
        </div>
        <div className="space-y-2">
          {Object.entries(pricing).map(([name, price]) => (
            <div key={name} className="flex items-center gap-4 py-2 border-b border-gray-100 dark:border-white/5">
              <span className="flex-1 text-sm text-[#1c1c1e] dark:text-[#f5f5f7]">{name}</span>
              <div className="flex items-center gap-1.5">
                <span className="text-sm text-[#8e8e93]">$</span>
                <input
                  type="number"
                  value={price}
                  onChange={e => setPricing(p => ({ ...p, [name]: Number(e.target.value) }))}
                  className="w-20 px-2 py-1 text-right text-sm font-semibold rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-zinc-800 text-[#1c1c1e] dark:text-[#f5f5f7] focus:ring-2 focus:ring-[#0A84FF]/20 focus:border-[#0A84FF] outline-none"
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Notifications */}
      <div className="bg-white/80 dark:bg-zinc-900/70 backdrop-blur-xl border border-white/60 dark:border-white/10 rounded-2xl p-6">
        <h2 className="font-black tracking-[-0.02em] text-[#1c1c1e] dark:text-[#f5f5f7] mb-5">Notifications</h2>
        <div className="space-y-4">
          {[
            { key: 'new_quote', label: 'New quote request', desc: 'When a builder submits a floor plan' },
            { key: 'analysis_complete', label: 'Analysis complete', desc: 'When AI finishes analysing a floor plan' },
            { key: 'builder_signup', label: 'Builder signup', desc: 'When a new builder creates an account' },
            { key: 'quote_accepted', label: 'Quote accepted', desc: 'When a builder accepts a quote' },
          ].map(notif => (
            <div key={notif.key} className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-[#1c1c1e] dark:text-[#f5f5f7]">{notif.label}</p>
                <p className="text-xs text-[#8e8e93]">{notif.desc}</p>
              </div>
              <Toggle
                value={notifications[notif.key]}
                onChange={v => setNotifications(n => ({ ...n, [notif.key]: v }))}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Team */}
      <div className="bg-white/80 dark:bg-zinc-900/70 backdrop-blur-xl border border-white/60 dark:border-white/10 rounded-2xl p-6">
        <h2 className="font-black tracking-[-0.02em] text-[#1c1c1e] dark:text-[#f5f5f7] mb-5">Team</h2>
        {users.length === 0 ? (
          <p className="text-sm text-[#8e8e93]">No team members yet</p>
        ) : users.slice(0, 5).map(u => (
          <div key={u.id} className="flex items-center gap-3 py-2 border-b border-gray-100 dark:border-white/5">
            <div className="w-8 h-8 rounded-full bg-[#0A84FF] flex items-center justify-center text-white font-bold text-xs">
              {u.name?.charAt(0)?.toUpperCase()}
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-[#1c1c1e] dark:text-[#f5f5f7]">{u.name}</p>
              <p className="text-xs text-[#8e8e93]">{u.email}</p>
            </div>
            <span className="text-xs text-[#8e8e93] capitalize">{u.role}</span>
          </div>
        ))}
      </div>

      {/* Save */}
      <motion.button
        onClick={handleSave}
        disabled={saving}
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.98 }}
        className={`w-full py-4 font-black text-lg rounded-2xl transition-all ${
          saved
            ? 'bg-[#34c759] text-white'
            : 'bg-[#0A84FF] hover:bg-[#0070d6] text-white'
        }`}
      >
        {saving ? 'Saving…' : saved ? '✓ Saved' : 'Save Settings'}
      </motion.button>
    </motion.div>
  )
}
