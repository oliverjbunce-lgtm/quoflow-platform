'use client'
import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'

export default function PortalSettingsPage() {
  const [user, setUser] = useState(null)
  const [form, setForm] = useState({ name: '', email: '', location: '', company: '', newPassword: '', confirmPassword: '' })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch('/api/auth/me').then(r => r.json()).then(d => {
      setUser(d.user)
      setForm(f => ({ ...f, name: d.user?.name || '', email: d.user?.email || '', location: d.user?.location || '' }))
    })
  }, [])

  async function handleSave(e) {
    e.preventDefault()
    if (form.newPassword && form.newPassword !== form.confirmPassword) {
      setError('Passwords do not match')
      return
    }
    setSaving(true)
    setError('')
    await new Promise(r => setTimeout(r, 800))
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="space-y-6 max-w-lg">
      <h1 className="text-3xl font-bold tracking-[-0.02em] text-[#1c1c1e] dark:text-[#f5f5f7]">Settings</h1>

      <form onSubmit={handleSave} className="space-y-5 bg-white/80 dark:bg-zinc-900/70 backdrop-blur-xl border border-white/60 dark:border-white/10 rounded-2xl p-6">
        <h2 className="font-bold text-[#1c1c1e] dark:text-[#f5f5f7]">Personal Info</h2>

        {[
          { key: 'name', label: 'Full Name', type: 'text' },
          { key: 'email', label: 'Email', type: 'email' },
          { key: 'company', label: 'Company', type: 'text' },
          { key: 'location', label: 'Location', type: 'text' },
        ].map(field => (
          <div key={field.key}>
            <label className="text-xs font-semibold tracking-[0.08em] uppercase text-[#8e8e93] block mb-1.5">{field.label}</label>
            <input
              type={field.type}
              value={form[field.key]}
              onChange={e => setForm(f => ({ ...f, [field.key]: e.target.value }))}
              className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-zinc-800 text-[#1c1c1e] dark:text-[#f5f5f7] text-sm focus:ring-2 focus:ring-[#0A84FF]/20 focus:border-[#0A84FF] outline-none"
            />
          </div>
        ))}

        <div className="pt-4 border-t border-gray-100 dark:border-white/10">
          <h3 className="font-bold text-[#1c1c1e] dark:text-[#f5f5f7] mb-4">Change Password</h3>
          {['newPassword', 'confirmPassword'].map(key => (
            <div key={key} className="mb-3">
              <label className="text-xs font-semibold tracking-[0.08em] uppercase text-[#8e8e93] block mb-1.5">
                {key === 'newPassword' ? 'New Password' : 'Confirm Password'}
              </label>
              <input
                type="password"
                value={form[key]}
                onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                placeholder="••••••••"
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-zinc-800 text-[#1c1c1e] dark:text-[#f5f5f7] text-sm focus:ring-2 focus:ring-[#0A84FF]/20 focus:border-[#0A84FF] outline-none"
              />
            </div>
          ))}
        </div>

        {error && <p className="text-sm text-[#ff3b30]">{error}</p>}

        <motion.button
          type="submit"
          disabled={saving}
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.98 }}
          className={`w-full py-3.5 font-bold rounded-xl transition-all ${
            saved ? 'bg-[#34c759] text-white' : 'bg-[#0A84FF] hover:bg-[#0070d6] text-white'
          }`}
        >
          {saving ? 'Saving…' : saved ? '✓ Saved' : 'Save Changes'}
        </motion.button>
      </form>
    </motion.div>
  )
}
