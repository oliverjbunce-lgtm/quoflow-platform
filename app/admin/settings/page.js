'use client'
import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { DEFAULT_UNIT_PRICES } from '@/lib/mockData'
import {
  ChevronDown, ChevronRight, Upload, Download, Plus, Trash2, Edit2,
  X, Check, Package, DollarSign, Settings2
} from 'lucide-react'

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
    if (Number(val) !== Number(value)) {
      try {
        await fetch(`/api/products/variants/${variantId}`, {
          method: 'PUT', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ price: parseFloat(val) }),
        })
        onSaved?.(variantId, parseFloat(val))
      } catch {}
    }
  }
  if (editing) {
    return (
      <input ref={inputRef} type="number" value={val}
        onChange={e => setVal(e.target.value)} onBlur={handleBlur}
        onKeyDown={e => e.key === 'Enter' && inputRef.current?.blur()}
        className="w-20 px-2 py-1 text-right text-sm font-semibold rounded-lg border border-[#0A84FF] bg-white dark:bg-zinc-800 text-[#1c1c1e] dark:text-[#f5f5f7] outline-none"
      />
    )
  }
  return (
    <span onClick={() => setEditing(true)}
      className="cursor-pointer hover:text-[#0A84FF] font-semibold tabular-nums transition-colors" title="Click to edit">
      ${Number(val).toFixed(2)}
    </span>
  )
}

// --- ADD PRODUCT MODAL ---
function AddProductModal({ onClose, onAdd }) {
  const [name, setName] = useState('')
  const [category, setCategory] = useState('door')
  const [description, setDescription] = useState('')
  const [saving, setSaving] = useState(false)
  async function handleSubmit(e) {
    e.preventDefault()
    if (!name.trim()) return
    setSaving(true)
    try {
      const res = await fetch('/api/products', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), category, description }),
      })
      const data = await res.json()
      if (data.product) onAdd(data.product)
      onClose()
    } catch {} finally { setSaving(false) }
  }
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-zinc-900 rounded-2xl p-6 w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-bold text-lg text-[#1c1c1e] dark:text-[#f5f5f7]">Add Product</h3>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-zinc-800"><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-semibold tracking-wide uppercase text-[#8e8e93] block mb-1.5">Product Name *</label>
            <input value={name} onChange={e => setName(e.target.value)} required placeholder="e.g. Single Prehung - LH"
              className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-zinc-800 text-[#1c1c1e] dark:text-[#f5f5f7] text-sm outline-none focus:ring-2 focus:ring-[#0A84FF]/20 focus:border-[#0A84FF]" />
          </div>
          <div>
            <label className="text-xs font-semibold tracking-wide uppercase text-[#8e8e93] block mb-1.5">Category</label>
            <select value={category} onChange={e => setCategory(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-zinc-800 text-[#1c1c1e] dark:text-[#f5f5f7] text-sm outline-none">
              <option value="door">Door</option>
              <option value="window">Window</option>
              <option value="hardware">Hardware</option>
              <option value="custom">Custom</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold tracking-wide uppercase text-[#8e8e93] block mb-1.5">Description (optional)</label>
            <input value={description} onChange={e => setDescription(e.target.value)} placeholder="Optional description"
              className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-zinc-800 text-[#1c1c1e] dark:text-[#f5f5f7] text-sm outline-none focus:ring-2 focus:ring-[#0A84FF]/20 focus:border-[#0A84FF]" />
          </div>
          <div className="flex gap-2 pt-2">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 dark:border-white/10 text-sm font-medium hover:bg-gray-50 dark:hover:bg-white/5">Cancel</button>
            <button type="submit" disabled={saving} className="flex-1 px-4 py-2.5 rounded-xl bg-[#0A84FF] text-white text-sm font-medium hover:bg-[#0A84FF]/90 disabled:opacity-50">
              {saving ? 'Adding…' : 'Add Product'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// --- ADD VARIANT MODAL ---
function AddVariantModal({ product, onClose, onAdd }) {
  const WIDTH_OPTIONS = [600, 700, 760, 810, 860, 910]
  const HEIGHT_OPTIONS = [2040, 2100]
  const [width, setWidth] = useState('760')
  const [customWidth, setCustomWidth] = useState('')
  const [height, setHeight] = useState('2040')
  const [customHeight, setCustomHeight] = useState('')
  const [core, setCore] = useState('Hollow Core')
  const [finish, setFinish] = useState('Raw')
  const [frame, setFrame] = useState('LJ&P Standard')
  const [handing, setHanding] = useState('N/A')
  const [sku, setSku] = useState('')
  const [price, setPrice] = useState('')
  const [saving, setSaving] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    if (!price) return
    setSaving(true)
    const finalWidth = width === 'custom' ? parseInt(customWidth) : parseInt(width)
    const finalHeight = height === 'custom' ? parseInt(customHeight) : parseInt(height)
    try {
      const res = await fetch(`/api/products/${product.id}/variants`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ width_mm: finalWidth, height_mm: finalHeight, core, finish, frame, handing, sku, price: parseFloat(price) }),
      })
      const data = await res.json()
      if (data.variant) onAdd(product.id, data.variant)
      onClose()
    } catch {} finally { setSaving(false) }
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-zinc-900 rounded-2xl p-6 w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="font-bold text-lg text-[#1c1c1e] dark:text-[#f5f5f7]">Add Variant</h3>
            <p className="text-sm text-[#8e8e93]">{product.name}</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-zinc-800"><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold tracking-wide uppercase text-[#8e8e93] block mb-1.5">Width (mm)</label>
              <select value={width} onChange={e => setWidth(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-zinc-800 text-sm outline-none">
                {WIDTH_OPTIONS.map(w => <option key={w} value={w}>{w}mm</option>)}
                <option value="custom">Custom…</option>
              </select>
              {width === 'custom' && (
                <input type="number" value={customWidth} onChange={e => setCustomWidth(e.target.value)}
                  placeholder="Enter mm" className="mt-2 w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-zinc-800 text-sm outline-none" />
              )}
            </div>
            <div>
              <label className="text-xs font-semibold tracking-wide uppercase text-[#8e8e93] block mb-1.5">Height (mm)</label>
              <select value={height} onChange={e => setHeight(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-zinc-800 text-sm outline-none">
                {HEIGHT_OPTIONS.map(h => <option key={h} value={h}>{h}mm</option>)}
                <option value="custom">Custom…</option>
              </select>
              {height === 'custom' && (
                <input type="number" value={customHeight} onChange={e => setCustomHeight(e.target.value)}
                  placeholder="Enter mm" className="mt-2 w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-zinc-800 text-sm outline-none" />
              )}
            </div>
            <div>
              <label className="text-xs font-semibold tracking-wide uppercase text-[#8e8e93] block mb-1.5">Core</label>
              <select value={core} onChange={e => setCore(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-zinc-800 text-sm outline-none">
                <option>Hollow Core</option><option>Solid Core</option><option>Fire Rated (FD30)</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold tracking-wide uppercase text-[#8e8e93] block mb-1.5">Finish</label>
              <select value={finish} onChange={e => setFinish(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-zinc-800 text-sm outline-none">
                <option>Raw</option><option>Primed</option><option>Pre-finished White</option><option>Custom</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold tracking-wide uppercase text-[#8e8e93] block mb-1.5">Frame</label>
              <select value={frame} onChange={e => setFrame(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-zinc-800 text-sm outline-none">
                <option>LJ&P Standard</option><option>Rebate Only</option><option>No Frame</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold tracking-wide uppercase text-[#8e8e93] block mb-1.5">Handing</label>
              <select value={handing} onChange={e => setHanding(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-zinc-800 text-sm outline-none">
                <option>Left Hand</option><option>Right Hand</option><option>N/A</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold tracking-wide uppercase text-[#8e8e93] block mb-1.5">SKU (optional)</label>
              <input value={sku} onChange={e => setSku(e.target.value)} placeholder="Auto-generated if blank"
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-zinc-800 text-sm outline-none" />
            </div>
            <div>
              <label className="text-xs font-semibold tracking-wide uppercase text-[#8e8e93] block mb-1.5">Price (NZD) *</label>
              <input type="number" value={price} onChange={e => setPrice(e.target.value)} required placeholder="0.00" min="0" step="0.01"
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-zinc-800 text-sm outline-none focus:ring-2 focus:ring-[#0A84FF]/20 focus:border-[#0A84FF]" />
            </div>
          </div>
          <div className="flex gap-2 pt-2">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 dark:border-white/10 text-sm font-medium hover:bg-gray-50 dark:hover:bg-white/5">Cancel</button>
            <button type="submit" disabled={saving} className="flex-1 px-4 py-2.5 rounded-xl bg-[#0A84FF] text-white text-sm font-medium hover:bg-[#0A84FF]/90 disabled:opacity-50">
              {saving ? 'Adding…' : 'Add Variant'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// --- PRICING RULES TAB ---
function PricingRulesTab() {
  const [rules, setRules] = useState([])
  const [showAdd, setShowAdd] = useState(false)
  const [saving, setSaving] = useState(false)
  const [newRule, setNewRule] = useState({
    label: '', field: 'width', operator: '>', value: '', action: 'ADD', amount: ''
  })

  useEffect(() => {
    fetch('/api/auth/me').then(r => r.json()).then(d => {
      try {
        const s = typeof d.tenant?.settings_json === 'string'
          ? JSON.parse(d.tenant.settings_json) : (d.tenant?.settings_json || {})
        setRules(s.pricing_rules || [])
      } catch {}
    }).catch(() => {})
  }, [])

  async function saveRules(updatedRules) {
    setSaving(true)
    try {
      await fetch('/api/settings', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pricing_rules: updatedRules }),
      })
    } catch {} finally { setSaving(false) }
  }

  function addRule() {
    if (!newRule.value || !newRule.amount) return
    const updated = [...rules, { ...newRule, id: Date.now().toString() }]
    setRules(updated)
    saveRules(updated)
    setNewRule({ label: '', field: 'width', operator: '>', value: '', action: 'ADD', amount: '' })
    setShowAdd(false)
  }

  function deleteRule(id) {
    const updated = rules.filter(r => r.id !== id)
    setRules(updated)
    saveRules(updated)
  }

  const fieldLabels = { width: 'Width (mm)', height: 'Height (mm)', core: 'Core', finish: 'Finish', frame: 'Frame', category: 'Category' }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-[#8e8e93]">Rules automatically adjust prices on top of base variant prices.</p>
        <button onClick={() => setShowAdd(!showAdd)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#0A84FF] text-white text-sm font-medium hover:bg-[#0A84FF]/90">
          <Plus size={16} strokeWidth={1.5} /> Add Rule
        </button>
      </div>

      {showAdd && (
        <div className="bg-gray-50 dark:bg-zinc-800/50 rounded-2xl p-4 space-y-3">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-semibold text-[#8e8e93] uppercase block mb-1">Field</label>
              <select value={newRule.field} onChange={e => setNewRule(r => ({ ...r, field: e.target.value }))}
                className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-zinc-800 text-sm outline-none">
                {Object.entries(fieldLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-[#8e8e93] uppercase block mb-1">Operator</label>
              <select value={newRule.operator} onChange={e => setNewRule(r => ({ ...r, operator: e.target.value }))}
                className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-zinc-800 text-sm outline-none">
                <option value=">">&gt;</option><option value="<">&lt;</option>
                <option value="=">=</option><option value=">=">&gt;=</option>
                <option value="<=">&lt;=</option><option value="contains">contains</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-[#8e8e93] uppercase block mb-1">Value</label>
              <input value={newRule.value} onChange={e => setNewRule(r => ({ ...r, value: e.target.value }))}
                placeholder="e.g. 900 or Solid Core"
                className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-zinc-800 text-sm outline-none" />
            </div>
            <div>
              <label className="text-xs font-semibold text-[#8e8e93] uppercase block mb-1">Action</label>
              <select value={newRule.action} onChange={e => setNewRule(r => ({ ...r, action: e.target.value }))}
                className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-zinc-800 text-sm outline-none">
                <option>ADD</option><option>SUBTRACT</option><option>MULTIPLY</option><option>SET</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-[#8e8e93] uppercase block mb-1">Amount</label>
              <input type="number" value={newRule.amount} onChange={e => setNewRule(r => ({ ...r, amount: e.target.value }))}
                placeholder="e.g. 90"
                className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-zinc-800 text-sm outline-none" />
            </div>
            <div>
              <label className="text-xs font-semibold text-[#8e8e93] uppercase block mb-1">Label (optional)</label>
              <input value={newRule.label} onChange={e => setNewRule(r => ({ ...r, label: e.target.value }))}
                placeholder="e.g. Wide door surcharge"
                className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-zinc-800 text-sm outline-none" />
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setShowAdd(false)} className="px-4 py-2 rounded-xl border border-gray-200 dark:border-white/10 text-sm font-medium">Cancel</button>
            <button onClick={addRule} className="px-4 py-2 rounded-xl bg-[#0A84FF] text-white text-sm font-medium">Save Rule</button>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {rules.length === 0 ? (
          <p className="text-sm text-[#8e8e93] py-8 text-center">No pricing rules yet. Add one to auto-adjust prices.</p>
        ) : rules.map(rule => (
          <div key={rule.id} className="flex items-center gap-4 p-4 bg-white/80 dark:bg-zinc-900/70 rounded-2xl border border-white/60 dark:border-white/10">
            <div className="flex-1">
              <p className="text-sm font-medium text-[#1c1c1e] dark:text-[#f5f5f7]">
                IF {fieldLabels[rule.field] || rule.field} {rule.operator} <span className="font-semibold text-[#0A84FF]">{rule.value}</span>
                {' '}→ {rule.action} <span className="font-semibold text-[#0A84FF]">${rule.amount}</span>
              </p>
              {rule.label && <p className="text-xs text-[#8e8e93] mt-0.5">{rule.label}</p>}
            </div>
            <button onClick={() => deleteRule(rule.id)} className="p-2 rounded-xl hover:bg-red-50 dark:hover:bg-red-950/20 text-[#8e8e93] hover:text-red-500 transition-colors">
              <Trash2 size={14} strokeWidth={1.5} />
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}

// --- CUSTOM ITEMS TAB ---
function CustomItemsTab() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState({ name: '', description: '', default_price: '', price_type: 'fixed' })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetch('/api/custom-items').then(r => r.json())
      .then(d => { setItems(d.items || []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  async function handleAdd() {
    if (!form.name.trim()) return
    setSaving(true)
    try {
      const res = await fetch('/api/custom-items', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, default_price: form.default_price ? parseFloat(form.default_price) : null }),
      })
      const data = await res.json()
      if (data.item) setItems(prev => [data.item, ...prev])
      setForm({ name: '', description: '', default_price: '', price_type: 'fixed' })
      setShowAdd(false)
    } catch {} finally { setSaving(false) }
  }

  async function handleUpdate(id) {
    setSaving(true)
    try {
      const res = await fetch(`/api/custom-items/${id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, default_price: form.default_price ? parseFloat(form.default_price) : null }),
      })
      const data = await res.json()
      if (data.item) setItems(prev => prev.map(i => i.id === id ? data.item : i))
      setEditingId(null)
    } catch {} finally { setSaving(false) }
  }

  async function handleDelete(id) {
    if (!confirm('Delete this custom item?')) return
    await fetch(`/api/custom-items/${id}`, { method: 'DELETE' })
    setItems(prev => prev.filter(i => i.id !== id))
  }

  const priceTypeLabels = { fixed: 'Fixed', per_unit: 'Per unit', variable: 'Variable' }

  if (loading) return <div className="py-12 text-center text-sm text-[#8e8e93]">Loading…</div>

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-[#8e8e93]">Freeform items that can be added to any quote.</p>
        <button onClick={() => { setShowAdd(true); setEditingId(null); setForm({ name: '', description: '', default_price: '', price_type: 'fixed' }) }}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#0A84FF] text-white text-sm font-medium hover:bg-[#0A84FF]/90">
          <Plus size={16} strokeWidth={1.5} /> Add Item
        </button>
      </div>

      {(showAdd || editingId) && (
        <div className="bg-gray-50 dark:bg-zinc-800/50 rounded-2xl p-4 space-y-3">
          <h4 className="text-sm font-semibold text-[#1c1c1e] dark:text-[#f5f5f7]">{editingId ? 'Edit Item' : 'New Custom Item'}</h4>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="text-xs font-semibold text-[#8e8e93] uppercase block mb-1">Name *</label>
              <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="e.g. Delivery Fee"
                className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-zinc-800 text-sm outline-none" />
            </div>
            <div>
              <label className="text-xs font-semibold text-[#8e8e93] uppercase block mb-1">Default Price (NZD)</label>
              <input type="number" value={form.default_price} onChange={e => setForm(f => ({ ...f, default_price: e.target.value }))}
                placeholder="0.00" min="0" step="0.01"
                className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-zinc-800 text-sm outline-none" />
            </div>
            <div>
              <label className="text-xs font-semibold text-[#8e8e93] uppercase block mb-1">Price Type</label>
              <select value={form.price_type} onChange={e => setForm(f => ({ ...f, price_type: e.target.value }))}
                className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-zinc-800 text-sm outline-none">
                <option value="fixed">Fixed</option>
                <option value="per_unit">Per Unit</option>
                <option value="variable">Variable</option>
              </select>
            </div>
            <div className="col-span-2">
              <label className="text-xs font-semibold text-[#8e8e93] uppercase block mb-1">Description (optional)</label>
              <input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                placeholder="Optional description"
                className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-zinc-800 text-sm outline-none" />
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={() => { setShowAdd(false); setEditingId(null) }} className="px-4 py-2 rounded-xl border border-gray-200 dark:border-white/10 text-sm font-medium">Cancel</button>
            <button onClick={editingId ? () => handleUpdate(editingId) : handleAdd} disabled={saving}
              className="px-4 py-2 rounded-xl bg-[#0A84FF] text-white text-sm font-medium disabled:opacity-50">
              {saving ? 'Saving…' : editingId ? 'Update' : 'Add Item'}
            </button>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {items.length === 0 ? (
          <p className="text-sm text-[#8e8e93] py-8 text-center">No custom items yet.</p>
        ) : items.map(item => (
          <div key={item.id} className="flex items-center gap-4 p-4 bg-white/80 dark:bg-zinc-900/70 rounded-2xl border border-white/60 dark:border-white/10">
            <div className="flex-1">
              <p className="text-sm font-semibold text-[#1c1c1e] dark:text-[#f5f5f7]">{item.name}</p>
              {item.description && <p className="text-xs text-[#8e8e93] mt-0.5">{item.description}</p>}
            </div>
            <span className="text-sm font-semibold text-[#1c1c1e] dark:text-[#f5f5f7]">
              {item.default_price != null ? `$${Number(item.default_price).toFixed(2)}` : '—'}
            </span>
            <span className="text-xs text-[#8e8e93] bg-gray-100 dark:bg-zinc-800 px-2 py-1 rounded-lg capitalize">
              {priceTypeLabels[item.price_type] || item.price_type}
            </span>
            <div className="flex gap-1">
              <button onClick={() => { setEditingId(item.id); setShowAdd(false); setForm({ name: item.name, description: item.description || '', default_price: item.default_price?.toString() || '', price_type: item.price_type }) }}
                className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-zinc-800 text-[#8e8e93] hover:text-[#0A84FF] transition-colors">
                <Edit2 size={14} strokeWidth={1.5} />
              </button>
              <button onClick={() => handleDelete(item.id)}
                className="p-2 rounded-xl hover:bg-red-50 dark:hover:bg-red-950/20 text-[#8e8e93] hover:text-red-500 transition-colors">
                <Trash2 size={14} strokeWidth={1.5} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// --- PRODUCT MODIFIERS SECTION ---
function ProductModifiersSection({ product }) {
  const [modifiers, setModifiers] = useState([])
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState(null)
  const [editVal, setEditVal] = useState('')
  const [showAdd, setShowAdd] = useState(false)
  const [newMod, setNewMod] = useState({ attribute: 'width_mm', value: '', adjustment: '', adjustment_type: 'add' })
  const [basePrice, setBasePrice] = useState(product.base_price || 0)
  const [editingBase, setEditingBase] = useState(false)
  const [basePriceInput, setBasePriceInput] = useState(String(product.base_price || 0))

  useEffect(() => {
    fetch(`/api/products/${product.id}/modifiers`)
      .then(r => r.json())
      .then(d => { setModifiers(d.modifiers || []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [product.id])

  const groupedMods = modifiers.reduce((acc, m) => {
    if (!acc[m.attribute]) acc[m.attribute] = []
    acc[m.attribute].push(m)
    return acc
  }, {})

  async function saveModifier(id, adjustment) {
    await fetch(`/api/products/modifiers/${id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ adjustment: parseFloat(adjustment) }),
    })
    setModifiers(prev => prev.map(m => m.id === id ? { ...m, adjustment: parseFloat(adjustment) } : m))
    setEditingId(null)
  }

  async function deleteModifier(id) {
    await fetch(`/api/products/modifiers/${id}`, { method: 'DELETE' })
    setModifiers(prev => prev.filter(m => m.id !== id))
  }

  async function addModifier() {
    if (!newMod.value || newMod.adjustment === '') return
    const res = await fetch(`/api/products/${product.id}/modifiers`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...newMod, adjustment: parseFloat(newMod.adjustment) }),
    })
    const data = await res.json()
    if (data.modifier) setModifiers(prev => [...prev, data.modifier])
    setNewMod({ attribute: 'width_mm', value: '', adjustment: '', adjustment_type: 'add' })
    setShowAdd(false)
  }

  async function saveBasePrice() {
    const p = parseFloat(basePriceInput) || 0
    setBasePrice(p)
    setEditingBase(false)
    await fetch(`/api/products/${product.id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ base_price: p }),
    }).catch(() => {})
  }

  const attrLabels = { width_mm: 'Width', height_mm: 'Height', core: 'Core', finish: 'Finish', frame: 'Frame', handing: 'Handing' }

  return (
    <div className="px-5 py-4 border-t border-gray-100 dark:border-white/5 bg-gray-50/30 dark:bg-white/2">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <span className="text-xs font-semibold uppercase tracking-wide text-[#8e8e93]">Modifier Pricing</span>
          <span className="text-xs text-[#8e8e93]">Base price:</span>
          {editingBase ? (
            <input
              autoFocus
              type="number"
              value={basePriceInput}
              onChange={e => setBasePriceInput(e.target.value)}
              onBlur={saveBasePrice}
              onKeyDown={e => e.key === 'Enter' && saveBasePrice()}
              className="w-24 px-2 py-0.5 text-sm font-semibold rounded-lg border border-[#0A84FF] bg-white dark:bg-zinc-800 outline-none"
            />
          ) : (
            <button onClick={() => { setEditingBase(true); setBasePriceInput(String(basePrice)) }}
              className="text-sm font-semibold text-[#1c1c1e] dark:text-[#f5f5f7] hover:text-[#0A84FF] transition-colors tabular-nums">
              ${Number(basePrice).toFixed(2)}
            </button>
          )}
        </div>
        <button onClick={() => setShowAdd(!showAdd)}
          className="text-xs text-[#0A84FF] hover:text-[#0070d6] font-semibold flex items-center gap-1 transition-colors">
          <Plus size={12} strokeWidth={2} /> Add modifier
        </button>
      </div>

      {loading ? (
        <p className="text-xs text-[#8e8e93] py-2">Loading modifiers…</p>
      ) : (
        <div className="space-y-3">
          {Object.entries(groupedMods).map(([attr, mods]) => (
            <div key={attr}>
              <p className="text-xs font-semibold text-[#8e8e93] mb-1.5 capitalize">{attrLabels[attr] || attr} modifiers:</p>
              <div className="flex flex-wrap gap-2">
                {mods.map(mod => (
                  <div key={mod.id} className="flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-zinc-800 rounded-xl border border-gray-200 dark:border-white/10 group text-xs">
                    <span className="font-medium text-[#1c1c1e] dark:text-[#f5f5f7]">{mod.value}</span>
                    {editingId === mod.id ? (
                      <input
                        autoFocus
                        type="number"
                        defaultValue={mod.adjustment}
                        onBlur={e => saveModifier(mod.id, e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && saveModifier(mod.id, e.target.value)}
                        className="w-16 px-1 py-0.5 text-xs rounded border border-[#0A84FF] bg-white dark:bg-zinc-700 outline-none text-right"
                      />
                    ) : (
                      <button onClick={() => setEditingId(mod.id)}
                        className="tabular-nums font-semibold hover:text-[#0A84FF] transition-colors"
                        style={{ color: mod.adjustment >= 0 ? '#34c759' : '#ff3b30' }}>
                        {mod.adjustment >= 0 ? '+' : ''}${mod.adjustment}
                      </button>
                    )}
                    <button onClick={() => deleteModifier(mod.id)}
                      className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 transition-all ml-0.5">
                      <Trash2 size={10} strokeWidth={2} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))}

          {Object.keys(groupedMods).length === 0 && !showAdd && (
            <p className="text-xs text-[#8e8e93] italic">No modifiers — prices come from variant overrides only.</p>
          )}

          {showAdd && (
            <div className="bg-white dark:bg-zinc-800 rounded-xl border border-gray-200 dark:border-white/10 p-3 space-y-2">
              <div className="grid grid-cols-4 gap-2">
                <div>
                  <label className="text-xs text-[#8e8e93] block mb-1">Attribute</label>
                  <select value={newMod.attribute} onChange={e => setNewMod(m => ({ ...m, attribute: e.target.value }))}
                    className="w-full px-2 py-1.5 text-xs rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-zinc-700 outline-none">
                    {Object.entries(attrLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-[#8e8e93] block mb-1">Value</label>
                  <input value={newMod.value} onChange={e => setNewMod(m => ({ ...m, value: e.target.value }))}
                    placeholder="e.g. 910 or Primed"
                    className="w-full px-2 py-1.5 text-xs rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-zinc-700 outline-none" />
                </div>
                <div>
                  <label className="text-xs text-[#8e8e93] block mb-1">Adjustment ($)</label>
                  <input type="number" value={newMod.adjustment} onChange={e => setNewMod(m => ({ ...m, adjustment: e.target.value }))}
                    placeholder="e.g. 30 or -20"
                    className="w-full px-2 py-1.5 text-xs rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-zinc-700 outline-none" />
                </div>
                <div className="flex items-end gap-1">
                  <button onClick={addModifier} className="flex-1 py-1.5 px-2 rounded-lg bg-[#0A84FF] text-white text-xs font-medium hover:bg-[#0A84FF]/90">Save</button>
                  <button onClick={() => setShowAdd(false)} className="py-1.5 px-2 rounded-lg border border-gray-200 dark:border-white/10 text-xs hover:bg-gray-50 dark:hover:bg-white/5">✕</button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// --- CATALOGUE TAB (main) ---
function CatalogueTab() {
  const [catalogueTab, setCatalogueTab] = useState('products')
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState({})
  const [showAddProduct, setShowAddProduct] = useState(false)
  const [addVariantFor, setAddVariantFor] = useState(null)
  const fileInputRef = useRef(null)

  useEffect(() => {
    fetch('/api/products').then(r => r.json())
      .then(d => { setProducts(d.products || []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  function handlePriceUpdate(variantId, newPrice) {
    setProducts(prev => prev.map(p => ({
      ...p,
      variants: (p.variants || []).map(v => v.id === variantId ? { ...v, price: newPrice } : v),
    })))
  }

  async function handleExportCSV() {
    const res = await fetch('/api/products/export')
    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = 'products.csv'; a.click()
    URL.revokeObjectURL(url)
  }

  async function handleCSVImport(e) {
    const file = e.target.files?.[0]
    if (!file) return
    const fd = new FormData()
    fd.append('file', file)
    const res = await fetch('/api/products/import', { method: 'POST', body: fd })
    const data = await res.json()
    if (data.imported) {
      fetch('/api/products').then(r => r.json()).then(d => setProducts(d.products || []))
    }
    e.target.value = ''
  }

  async function deleteProduct(productId) {
    if (!confirm('Delete this product and all its variants?')) return
    await fetch(`/api/products/${productId}`, { method: 'DELETE' })
    setProducts(prev => prev.filter(p => p.id !== productId))
  }

  function handleProductAdded(product) {
    setProducts(prev => [...prev, { ...product, variants: [] }])
  }

  function handleVariantAdded(productId, variant) {
    setProducts(prev => prev.map(p =>
      p.id === productId ? { ...p, variants: [...(p.variants || []), variant] } : p
    ))
  }

  const grouped = products.reduce((acc, p) => {
    const cat = p.category || 'other'
    if (!acc[cat]) acc[cat] = []
    acc[cat].push(p)
    return acc
  }, {})

  if (loading) return <div className="py-12 text-center text-[#8e8e93] text-sm">Loading catalogue…</div>

  return (
    <div className="space-y-4">
      {showAddProduct && <AddProductModal onClose={() => setShowAddProduct(false)} onAdd={handleProductAdded} />}
      {addVariantFor && <AddVariantModal product={addVariantFor} onClose={() => setAddVariantFor(null)} onAdd={handleVariantAdded} />}

      {/* Top bar */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold tracking-tight text-[#1c1c1e] dark:text-[#f5f5f7]">Product Catalogue</h2>
          <p className="text-sm text-gray-500 mt-0.5">Manage your products, variants, pricing rules, and custom items</p>
        </div>
        <div className="flex gap-2">
          <label className="px-4 py-2 rounded-xl border border-gray-200 dark:border-white/10 text-sm font-medium cursor-pointer hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
            Import CSV
            <input type="file" accept=".csv" className="hidden" onChange={handleCSVImport} />
          </label>
          <button onClick={handleExportCSV} className="px-4 py-2 rounded-xl border border-gray-200 dark:border-white/10 text-sm font-medium hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
            Export CSV
          </button>
          {catalogueTab === 'products' && (
            <button onClick={() => setShowAddProduct(true)}
              className="px-4 py-2 rounded-xl bg-[#0A84FF] text-white text-sm font-medium hover:bg-[#0A84FF]/90 transition-colors flex items-center gap-2">
              <Plus size={16} strokeWidth={1.5} /> Add Product
            </button>
          )}
        </div>
      </div>

      {/* Sub-tabs */}
      <div className="flex gap-1 p-1 bg-gray-100 dark:bg-zinc-800 rounded-xl w-fit">
        {[
          { id: 'products', label: 'Products', icon: Package },
          { id: 'pricing-rules', label: 'Pricing Rules', icon: Settings2 },
          { id: 'custom-items', label: 'Custom Items', icon: DollarSign },
        ].map(tab => (
          <button key={tab.id} onClick={() => setCatalogueTab(tab.id)}
            className={`flex items-center gap-1.5 px-4 py-2 text-sm font-semibold rounded-lg transition-all ${catalogueTab === tab.id ? 'bg-white dark:bg-zinc-900 text-[#0A84FF] shadow-sm' : 'text-[#8e8e93] hover:text-[#1c1c1e] dark:hover:text-[#f5f5f7]'}`}>
            <tab.icon size={14} strokeWidth={1.5} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Products sub-tab */}
      {catalogueTab === 'products' && (
        <div className="space-y-3">
          {Object.keys(grouped).length === 0 ? (
            <div className="text-center py-16">
              <Package size={40} className="mx-auto text-[#8e8e93] mb-3" strokeWidth={1} />
              <p className="text-sm text-[#8e8e93]">No products yet. Add your first product above.</p>
            </div>
          ) : Object.entries(grouped).map(([category, catProducts]) => (
            <div key={category} className="bg-white/80 dark:bg-zinc-900/70 backdrop-blur-xl border border-white/60 dark:border-white/10 rounded-2xl overflow-hidden">
              <div className="px-5 py-3 border-b border-gray-100 dark:border-white/10 bg-gray-50/50 dark:bg-white/5">
                <h3 className="text-xs font-bold tracking-[0.1em] uppercase text-[#8e8e93] capitalize">{category}</h3>
              </div>
              <div className="divide-y divide-gray-100 dark:divide-white/5">
                {catProducts.map(product => {
                  const isExpanded = expanded[product.id]
                  const variants = product.variants || []
                  return (
                    <div key={product.id}>
                      <div className="flex items-center gap-2 px-5 py-3.5">
                        <button
                          onClick={() => setExpanded(e => ({ ...e, [product.id]: !e[product.id] }))}
                          className="flex items-center gap-3 flex-1 text-left hover:text-[#0A84FF] transition-colors group"
                        >
                          {isExpanded
                            ? <ChevronDown size={14} className="text-[#8e8e93] flex-shrink-0" />
                            : <ChevronRight size={14} className="text-[#8e8e93] flex-shrink-0" />}
                          <span className="text-sm font-semibold text-[#1c1c1e] dark:text-[#f5f5f7] group-hover:text-[#0A84FF]">{product.name}</span>
                          <span className="text-xs text-[#8e8e93] bg-gray-100 dark:bg-zinc-800 px-2 py-0.5 rounded-full capitalize">{product.category}</span>
                          <span className="text-xs text-[#8e8e93] ml-auto">{variants.length} variants</span>
                        </button>
                        <button onClick={() => setAddVariantFor(product)}
                          className="text-xs text-[#0A84FF] hover:text-[#0070d6] font-semibold px-2 py-1 rounded-lg hover:bg-[#0A84FF]/5 transition-colors">
                          + Variant
                        </button>
                        <button onClick={() => deleteProduct(product.id)}
                          className="p-1.5 rounded-lg text-[#8e8e93] hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors">
                          <Trash2 size={14} strokeWidth={1.5} />
                        </button>
                      </div>

                      {isExpanded && (
                        <div className="border-t border-gray-100 dark:border-white/5">
                          {variants.length === 0 ? (
                            <div className="px-5 py-4 text-sm text-[#8e8e93]">No variants. <button onClick={() => setAddVariantFor(product)} className="text-[#0A84FF] underline">Add one</button></div>
                          ) : (
                            <div className="overflow-x-auto">
                              <table className="w-full text-xs">
                                <thead>
                                  <tr className="bg-gray-50 dark:bg-white/5">
                                    {['W (mm)', 'H (mm)', 'Core', 'Finish', 'Frame', 'Handing', 'SKU', 'Price'].map(h => (
                                      <th key={h} className="px-4 py-2 text-left font-semibold text-[#8e8e93] uppercase tracking-[0.08em]">{h}</th>
                                    ))}
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50 dark:divide-white/5">
                                  {variants.slice(0, 100).map(v => (
                                    <tr key={v.id} className="hover:bg-gray-50/50 dark:hover:bg-white/3 transition-colors">
                                      <td className="px-4 py-2 text-[#1c1c1e] dark:text-[#f5f5f7]">{v.width_mm || '—'}</td>
                                      <td className="px-4 py-2 text-[#1c1c1e] dark:text-[#f5f5f7]">{v.height_mm || '—'}</td>
                                      <td className="px-4 py-2 text-[#1c1c1e] dark:text-[#f5f5f7]">{v.core || '—'}</td>
                                      <td className="px-4 py-2 text-[#1c1c1e] dark:text-[#f5f5f7]">{v.finish || '—'}</td>
                                      <td className="px-4 py-2 text-[#1c1c1e] dark:text-[#f5f5f7]">{v.frame || '—'}</td>
                                      <td className="px-4 py-2 text-[#1c1c1e] dark:text-[#f5f5f7]">{v.handing || '—'}</td>
                                      <td className="px-4 py-2 text-[#8e8e93] font-mono">{v.sku || '—'}</td>
                                      <td className="px-4 py-2 text-right">
                                        <CataloguePriceCell value={v.price} variantId={v.id} onSaved={handlePriceUpdate} />
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                              {variants.length > 100 && (
                                <p className="px-5 py-2 text-xs text-[#8e8e93]">Showing 100 of {variants.length} variants</p>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                      {isExpanded && <ProductModifiersSection product={product} />}
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pricing Rules sub-tab */}
      {catalogueTab === 'pricing-rules' && <PricingRulesTab />}

      {/* Custom Items sub-tab */}
      {catalogueTab === 'custom-items' && <CustomItemsTab />}
    </div>
  )
}

const TABS = ['Company', 'Pricing', 'Notifications', 'Team', 'Catalogue', 'Account']

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState('Company')
  const [company, setCompany] = useState({
    name: 'Demo Company', email: 'admin@quoflow.co.nz',
    phone: '+64 9 123 4567', address: 'Auckland, New Zealand',
    timezone: 'Pacific/Auckland', currency: 'NZD',
  })
  const [logoPreview, setLogoPreview] = useState(null)
  const [pricing, setPricing] = useState(DEFAULT_UNIT_PRICES)
  const [notifications, setNotifications] = useState({
    new_quote: true, analysis_complete: true, builder_signup: false, quote_accepted: true,
  })
  const [users, setUsers] = useState([])
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    fetch('/api/auth/me').then(r => r.json()).then(d => {
      if (d.tenant) {
        try {
          const s = typeof d.tenant.settings_json === 'string' ? JSON.parse(d.tenant.settings_json) : (d.tenant.settings_json || {})
          if (s.pricing) setPricing(p => ({ ...p, ...s.pricing }))
          if (s.email) setCompany(c => ({ ...c, email: s.email }))
          if (s.phone) setCompany(c => ({ ...c, phone: s.phone }))
          if (s.address) setCompany(c => ({ ...c, address: s.address }))
          setCompany(c => ({ ...c, name: d.tenant.name || c.name }))
          if (d.tenant.logo_url) setLogoPreview(d.tenant.logo_url)
        } catch {}
      }
    }).catch(() => {})
    fetch('/api/clients').then(r => r.json()).then(d => setUsers(d.clients || [])).catch(() => {})
  }, [])

  function handleLogoUpload(e) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => setLogoPreview(ev.target.result)
    reader.readAsDataURL(file)
  }

  async function handleSave() {
    setSaving(true)
    try {
      await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: company.name,
          email: company.email,
          phone: company.phone,
          address: company.address,
          currency: company.currency,
          logo_url: logoPreview,
        }),
      })
    } catch {}
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="space-y-6 max-w-4xl">

      {/* Tab bar */}
      <div className="flex gap-1 p-1 bg-white/80 dark:bg-zinc-900/70 backdrop-blur-xl border border-white/60 dark:border-white/10 rounded-xl w-fit">
        {TABS.map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm font-semibold rounded-lg transition-all ${activeTab === tab ? 'bg-[#0A84FF] text-white shadow-sm' : 'text-[#8e8e93] hover:text-[#1c1c1e] dark:hover:text-[#f5f5f7]'}`}>
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
                <input value={company[field.key] || ''} onChange={e => setCompany(c => ({ ...c, [field.key]: e.target.value }))}
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-zinc-800 text-[#1c1c1e] dark:text-[#f5f5f7] text-sm focus:ring-2 focus:ring-[#0A84FF]/20 focus:border-[#0A84FF] outline-none" />
              </div>
            ))}
            <div>
              <label className="text-xs font-semibold tracking-[0.08em] uppercase text-[#8e8e93] block mb-1.5">Currency</label>
              <select value={company.currency} onChange={e => setCompany(c => ({ ...c, currency: e.target.value }))}
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-zinc-800 text-[#1c1c1e] dark:text-[#f5f5f7] text-sm outline-none">
                <option value="NZD">NZD — New Zealand Dollar</option>
                <option value="AUD">AUD — Australian Dollar</option>
                <option value="USD">USD — US Dollar</option>
              </select>
            </div>
          </div>

          {/* Logo upload */}
          <div className="mt-5 pt-5 border-t border-gray-100 dark:border-white/10">
            <label className="text-xs font-semibold tracking-[0.08em] uppercase text-[#8e8e93] block mb-3">Company Logo</label>
            <div className="flex items-center gap-4">
              {logoPreview && (
                <div className="relative">
                  <img src={logoPreview} alt="Logo" className="h-12 object-contain rounded-xl border border-gray-200 dark:border-white/10 p-2 bg-white dark:bg-zinc-800" />
                  <button onClick={() => setLogoPreview(null)}
                    className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center text-xs hover:bg-red-600">
                    ×
                  </button>
                </div>
              )}
              <label className="px-4 py-2 rounded-xl border border-gray-200 dark:border-white/10 text-sm font-medium cursor-pointer hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                {logoPreview ? 'Change Logo' : 'Upload Logo'}
                <input type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
              </label>
              {logoPreview && <p className="text-xs text-[#8e8e93]">Appears on PDF quotes</p>}
            </div>
          </div>

          <div className="mt-6">
            <motion.button onClick={handleSave} disabled={saving} whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }}
              className={`px-6 py-3 font-bold rounded-xl transition-all ${saved ? 'bg-[#34c759] text-white' : 'bg-[#0A84FF] hover:bg-[#0070d6] text-white'}`}>
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
            <button onClick={() => setPricing(DEFAULT_UNIT_PRICES)} className="text-xs text-[#8e8e93] hover:text-[#ff3b30] font-semibold transition-colors">Reset to defaults</button>
          </div>
          <div className="space-y-2">
            {Object.entries(pricing).map(([name, price]) => (
              <div key={name} className="flex items-center gap-4 py-2 border-b border-gray-100 dark:border-white/5">
                <span className="flex-1 text-sm text-[#1c1c1e] dark:text-[#f5f5f7]">{name}</span>
                <div className="flex items-center gap-1.5">
                  <span className="text-sm text-[#8e8e93]">$</span>
                  <input type="number" value={price} onChange={e => setPricing(p => ({ ...p, [name]: Number(e.target.value) }))}
                    className="w-20 px-2 py-1 text-right text-sm font-semibold rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-zinc-800 text-[#1c1c1e] dark:text-[#f5f5f7] focus:ring-2 focus:ring-[#0A84FF]/20 focus:border-[#0A84FF] outline-none" />
                </div>
              </div>
            ))}
          </div>
          <div className="mt-5">
            <motion.button onClick={handleSave} disabled={saving} whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }}
              className={`px-6 py-3 font-bold rounded-xl transition-all ${saved ? 'bg-[#34c759] text-white' : 'bg-[#0A84FF] hover:bg-[#0070d6] text-white'}`}>
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
                <Toggle value={notifications[notif.key]} onChange={v => setNotifications(n => ({ ...n, [notif.key]: v }))} />
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
      {activeTab === 'Catalogue' && (
        <div className="bg-white/80 dark:bg-zinc-900/70 backdrop-blur-xl border border-white/60 dark:border-white/10 rounded-2xl p-6">
          <CatalogueTab />
        </div>
      )}

      {/* Account */}
      {activeTab === 'Account' && (
        <div className="bg-white/80 dark:bg-zinc-900/70 backdrop-blur-xl border border-white/60 dark:border-white/10 rounded-2xl p-6">
          <h2 className="font-bold tracking-[-0.02em] text-[#1c1c1e] dark:text-[#f5f5f7] mb-2">Account</h2>
          <p className="text-sm text-[#8e8e93] mb-6">Manage your account preferences.</p>
          <div className="space-y-4">
            <div className="flex items-center justify-between py-4 border-b border-gray-100 dark:border-white/10">
              <div>
                <p className="text-sm font-semibold text-[#1c1c1e] dark:text-[#f5f5f7]">Onboarding tour</p>
                <p className="text-xs text-[#8e8e93] mt-0.5">Replay the getting-started walkthrough</p>
              </div>
              <button
                onClick={async () => {
                  await fetch('/api/onboarding', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ reset: true }),
                  })
                  window.location.href = '/admin/dashboard'
                }}
                className="flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-200 dark:border-white/10 text-sm font-medium text-[#1c1c1e] dark:text-[#f5f5f7] hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
              >
                Restart onboarding tour
              </button>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  )
}
