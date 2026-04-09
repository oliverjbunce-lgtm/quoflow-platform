'use client'
import { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { DEFAULT_UNIT_PRICES } from '@/lib/mockData'
import { ChevronDown, ChevronRight, Upload, Download } from 'lucide-react'

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

function CataloguePriceCell({ value, variantId, onSaved }) {
  const [editing, setEditing] = useState(false)
  const [val, setVal] = useState(value)
  const inputRef = useRef(null)

  useEffect(() => { if (editing && inputRef.current) inputRef.current.focus() }, [editing])

  async function handleBlur() {
    setEditing(false)
    if (val !== value) {
      try {
        await fetch(`/api/products/variants/${variantId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ price: parseFloat(val) }),
        })
        onSaved?.(variantId, parseFloat(val))
      } catch {}
    }
  }

  if (editing) {
    return (
      <input
        ref={inputRef}
        type="number"
        value={val}
        onChange={e => setVal(e.target.value)}
        onBlur={handleBlur}
        onKeyDown={e => e.key === 'Enter' && inputRef.current?.blur()}
        className="w-20 px-2 py-1 text-right text-sm font-semibold rounded-lg border border-[#0A84FF] bg-white dark:bg-zinc-800 text-[#1c1c1e] dark:text-[#f5f5f7] outline-none"
      />
    )
  }
  return (
    <span
      onClick={() => setEditing(true)}
      className="cursor-pointer hover:text-[#0A84FF] font-semibold tabular-nums transition-colors"
      title="Click to edit"
    >
      ${Number(val).toFixed(2)}
    </span>
  )
}

function CatalogueTab() {
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState({})
  const fileInputRef = useRef(null)

  useEffect(() => {
    fetch('/api/products').then(r => r.json())
      .then(d => { setProducts(d.products || []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  function handlePriceUpdate(variantId, newPrice) {
    setProducts(prev => prev.map(p => ({
      ...p,
      variants: p.variants?.map(v => v.id === variantId ? { ...v, price: newPrice } : v) || []
    })))
  }

  async function handleExport() {
    const res = await fetch('/api/products/export')
    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = 'products.csv'; a.click()
    URL.revokeObjectURL(url)
  }

  async function handleImport(e) {
    const file = e.target.files?.[0]
    if (!file) return
    const fd = new FormData()
    fd.append('file', file)
    const res = await fetch('/api/products/import', { method: 'POST', body: fd })
    const data = await res.json()
    if (data.imported) {
      // Reload
      fetch('/api/products').then(r => r.json()).then(d => setProducts(d.products || []))
    }
    e.target.value = ''
  }

  const grouped = products.reduce((acc, p) => {
    const cat = p.category || 'other'
    if (!acc[cat]) acc[cat] = []
    acc[cat].push(p)
    return acc
  }, {})

  if (loading) return <div className="py-12 text-center text-[#8e8e93] text-sm">Loading catalogue…</div>

  return (
    <div className="space-y-6">
      {/* Header actions */}
      <div className="flex items-center gap-3">
        <button
          onClick={handleExport}
          className="flex items-center gap-1.5 px-3 py-2 text-sm font-semibold text-[#1c1c1e] dark:text-[#f5f5f7] bg-gray-100 dark:bg-zinc-800 rounded-xl hover:bg-gray-200 dark:hover:bg-zinc-700 transition-colors"
        >
          <Download size={14} strokeWidth={1.5} />
          Export CSV
        </button>
        <button
          onClick={() => fileInputRef.current?.click()}
          className="flex items-center gap-1.5 px-3 py-2 text-sm font-semibold text-white bg-[#0A84FF] rounded-xl hover:bg-[#0070d6] transition-colors"
        >
          <Upload size={14} strokeWidth={1.5} />
          Import CSV
        </button>
        <input ref={fileInputRef} type="file" accept=".csv" className="hidden" onChange={handleImport} />
      </div>

      {/* Products by category */}
      {Object.entries(grouped).map(([category, catProducts]) => (
        <div key={category} className="bg-white/80 dark:bg-zinc-900/70 backdrop-blur-xl border border-white/60 dark:border-white/10 rounded-2xl overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100 dark:border-white/10">
            <h3 className="text-xs font-semibold tracking-[0.1em] uppercase text-[#8e8e93] capitalize">{category}</h3>
          </div>
          <div className="divide-y divide-gray-100 dark:divide-white/5">
            {catProducts.map(product => {
              const isExpanded = expanded[product.id]
              const variants = product.variants || []
              return (
                <div key={product.id}>
                  <button
                    onClick={() => setExpanded(e => ({ ...e, [product.id]: !e[product.id] }))}
                    className="w-full flex items-center gap-3 px-5 py-3.5 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors text-left"
                  >
                    {isExpanded ? <ChevronDown size={14} className="text-[#8e8e93] flex-shrink-0" /> : <ChevronRight size={14} className="text-[#8e8e93] flex-shrink-0" />}
                    <span className="flex-1 text-sm font-semibold text-[#1c1c1e] dark:text-[#f5f5f7]">{product.name}</span>
                    <span className="text-xs text-[#8e8e93]">{variants.length} variants</span>
                  </button>

                  {isExpanded && variants.length > 0 && (
                    <div className="overflow-x-auto border-t border-gray-100 dark:border-white/5">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="bg-gray-50 dark:bg-white/5">
                            <th className="px-4 py-2 text-left font-semibold text-[#8e8e93] uppercase tracking-[0.08em]">W (mm)</th>
                            <th className="px-4 py-2 text-left font-semibold text-[#8e8e93] uppercase tracking-[0.08em]">H (mm)</th>
                            <th className="px-4 py-2 text-left font-semibold text-[#8e8e93] uppercase tracking-[0.08em]">Core</th>
                            <th className="px-4 py-2 text-left font-semibold text-[#8e8e93] uppercase tracking-[0.08em]">Finish</th>
                            <th className="px-4 py-2 text-left font-semibold text-[#8e8e93] uppercase tracking-[0.08em]">Frame</th>
                            <th className="px-4 py-2 text-right font-semibold text-[#8e8e93] uppercase tracking-[0.08em]">Price</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50 dark:divide-white/5">
                          {variants.slice(0, 50).map(v => (
                            <tr key={v.id} className="hover:bg-gray-50/50 dark:hover:bg-white/3 transition-colors">
                              <td className="px-4 py-2 text-[#1c1c1e] dark:text-[#f5f5f7]">{v.width_mm}</td>
                              <td className="px-4 py-2 text-[#1c1c1e] dark:text-[#f5f5f7]">{v.height_mm}</td>
                              <td className="px-4 py-2 text-[#1c1c1e] dark:text-[#f5f5f7]">{v.core}</td>
                              <td className="px-4 py-2 text-[#1c1c1e] dark:text-[#f5f5f7]">{v.finish}</td>
                              <td className="px-4 py-2 text-[#1c1c1e] dark:text-[#f5f5f7]">{v.frame}</td>
                              <td className="px-4 py-2 text-right">
                                <CataloguePriceCell value={v.price} variantId={v.id} onSaved={handlePriceUpdate} />
                              </td>
                            </tr>
                          ))}
                          {variants.length > 50 && (
                            <tr>
                              <td colSpan={6} className="px-4 py-2 text-center text-[#8e8e93]">
                                +{variants.length - 50} more variants
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      ))}

      {products.length === 0 && (
        <div className="py-16 text-center text-[#8e8e93]">
          <p className="text-sm">No products in catalogue. Import a CSV to get started.</p>
        </div>
      )}
    </div>
  )
}

const TABS = ['Company', 'Pricing', 'Notifications', 'Team', 'Catalogue']

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState('Company')
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
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="space-y-6 max-w-4xl">

      {/* Tab bar */}
      <div className="flex gap-1 p-1 bg-white/80 dark:bg-zinc-900/70 backdrop-blur-xl border border-white/60 dark:border-white/10 rounded-xl w-fit">
        {TABS.map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm font-semibold rounded-lg transition-all ${
              activeTab === tab
                ? 'bg-[#0A84FF] text-white shadow-sm'
                : 'text-[#8e8e93] hover:text-[#1c1c1e] dark:hover:text-[#f5f5f7]'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Company */}
      {activeTab === 'Company' && (
        <div className="bg-white/80 dark:bg-zinc-900/70 backdrop-blur-xl border border-white/60 dark:border-white/10 rounded-2xl p-6">
          <h2 className="font-bold tracking-[-0.02em] text-[#1c1c1e] dark:text-[#f5f5f7] mb-5">Company Details</h2>
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
          <div className="mt-6">
            <motion.button
              onClick={handleSave}
              disabled={saving}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
              className={`px-6 py-3 font-bold rounded-xl transition-all ${saved ? 'bg-[#34c759] text-white' : 'bg-[#0A84FF] hover:bg-[#0070d6] text-white'}`}
            >
              {saving ? 'Saving…' : saved ? '✓ Saved' : 'Save Changes'}
            </motion.button>
          </div>
        </div>
      )}

      {/* Pricing */}
      {activeTab === 'Pricing' && (
        <div className="bg-white/80 dark:bg-zinc-900/70 backdrop-blur-xl border border-white/60 dark:border-white/10 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-bold tracking-[-0.02em] text-[#1c1c1e] dark:text-[#f5f5f7]">Default Pricing</h2>
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
          <div className="mt-5">
            <motion.button
              onClick={handleSave}
              disabled={saving}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
              className={`px-6 py-3 font-bold rounded-xl transition-all ${saved ? 'bg-[#34c759] text-white' : 'bg-[#0A84FF] hover:bg-[#0070d6] text-white'}`}
            >
              {saving ? 'Saving…' : saved ? '✓ Saved' : 'Save Pricing'}
            </motion.button>
          </div>
        </div>
      )}

      {/* Notifications */}
      {activeTab === 'Notifications' && (
        <div className="bg-white/80 dark:bg-zinc-900/70 backdrop-blur-xl border border-white/60 dark:border-white/10 rounded-2xl p-6">
          <h2 className="font-bold tracking-[-0.02em] text-[#1c1c1e] dark:text-[#f5f5f7] mb-5">Notifications</h2>
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
      )}

      {/* Team */}
      {activeTab === 'Team' && (
        <div className="bg-white/80 dark:bg-zinc-900/70 backdrop-blur-xl border border-white/60 dark:border-white/10 rounded-2xl p-6">
          <h2 className="font-bold tracking-[-0.02em] text-[#1c1c1e] dark:text-[#f5f5f7] mb-5">Team</h2>
          {users.length === 0 ? (
            <p className="text-sm text-[#8e8e93]">No team members yet</p>
          ) : users.slice(0, 10).map(u => (
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
      )}

      {/* Catalogue */}
      {activeTab === 'Catalogue' && <CatalogueTab />}
    </motion.div>
  )
}
