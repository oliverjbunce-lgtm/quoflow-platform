'use client'
import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import EmptyState from '@/components/EmptyState'
import { SkeletonRow } from '@/components/SkeletonCard'
import { Users } from 'lucide-react'

function timeAgo(ts) {
  if (!ts) return 'Never'
  const diff = Math.floor(Date.now() / 1000) - Number(ts)
  if (diff < 86400) return 'Today'
  return `${Math.floor(diff / 86400)}d ago`
}

export default function ClientsPage() {
  const [clients, setClients] = useState([])
  const [loading, setLoading] = useState(true)
  const [inviting, setInviting] = useState(false)
  const [inviteUrl, setInviteUrl] = useState('')
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    fetch('/api/clients')
      .then(r => r.json())
      .then(d => { setClients(d.clients || []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  async function generateInvite() {
    setInviting(true)
    const res = await fetch('/api/invites', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ label: 'Builder Invite', role: 'builder' }),
    })
    const data = await res.json()
    setInviteUrl(data.inviteUrl || `${window.location.origin}/auth/signup?token=${data.token}`)
    setInviting(false)
  }

  async function copyInvite() {
    await navigator.clipboard.writeText(inviteUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">

      {/* Invite section */}
      <div className="bg-[#0A84FF]/10 dark:bg-[#0A84FF]/15 border border-[#0A84FF]/20 rounded-2xl p-5 flex items-center gap-4">
        <div className="flex-1">
          <h3 className="font-bold text-[#1c1c1e] dark:text-[#f5f5f7] mb-1">Invite a Builder</h3>
          <p className="text-sm text-[#8e8e93]">Generate a unique invite link for a new builder to create their account.</p>
          {inviteUrl && (
            <div className="mt-3 flex items-center gap-2">
              <input
                readOnly
                value={inviteUrl}
                className="flex-1 px-3 py-2 text-xs rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-zinc-800 text-[#8e8e93] font-mono"
              />
              <button
                onClick={copyInvite}
                className={`px-3 py-2 text-xs font-semibold rounded-xl transition-all ${
                  copied ? 'bg-[#34c759] text-white' : 'bg-[#0A84FF] text-white hover:bg-[#0070d6]'
                }`}
              >
                {copied ? '✓ Copied' : 'Copy'}
              </button>
            </div>
          )}
        </div>
        <motion.button
          onClick={generateInvite}
          disabled={inviting}
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.98 }}
          className="px-5 py-2.5 bg-[#0A84FF] hover:bg-[#0070d6] text-white font-semibold text-sm rounded-xl transition-all disabled:opacity-50 flex-shrink-0"
        >
          {inviting ? 'Generating…' : '+ Invite Builder'}
        </motion.button>
      </div>

      {/* Table */}
      <div className="bg-white/80 dark:bg-zinc-900/70 backdrop-blur-xl border border-white/60 dark:border-white/10 rounded-2xl overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-100 dark:border-white/10">
          <h2 className="font-bold tracking-[-0.02em] text-[#1c1c1e] dark:text-[#f5f5f7]">Builders / Clients</h2>
        </div>
        <table className="w-full">
          <thead>
            <tr className="text-xs font-semibold tracking-[0.08em] uppercase text-[#8e8e93] border-b border-gray-100 dark:border-white/10">
              {['Name', 'Email', 'Location', 'Orders', 'Last Active'].map((h, i) => (
                <th key={i} className={`px-4 py-4 text-left ${i === 0 ? 'pl-6' : ''}`}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 4 }).map((_, i) => <tr key={i}><td colSpan={5} className="px-4 py-3"><SkeletonRow /></td></tr>)
            ) : clients.length === 0 ? (
              <tr><td colSpan={5}>
                <EmptyState
                  icon={Users}
                  title="No builders yet"
                  description="Invite your first builder to get started"
                  action={{ label: '+ Invite Builder', onClick: generateInvite }}
                />
              </td></tr>
            ) : clients.map((c, i) => (
              <motion.tr
                key={c.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: i * 0.04 }}
                className="border-t border-gray-100 dark:border-white/5 hover:bg-gray-50/50 dark:hover:bg-white/5 transition-colors"
              >
                <td className="px-4 py-4 pl-6">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-[#0A84FF]/20 flex items-center justify-center text-[#0A84FF] font-bold text-sm">
                      {c.name?.charAt(0)?.toUpperCase()}
                    </div>
                    <span className="font-semibold text-sm text-[#1c1c1e] dark:text-[#f5f5f7]">{c.name}</span>
                  </div>
                </td>
                <td className="px-4 py-4 text-sm text-[#8e8e93]">{c.email}</td>
                <td className="px-4 py-4 text-sm text-[#8e8e93]">{c.location || '—'}</td>
                <td className="px-4 py-4 text-sm font-semibold text-[#1c1c1e] dark:text-[#f5f5f7]">{c.order_count || 0}</td>
                <td className="px-4 py-4 text-xs text-[#8e8e93]">{timeAgo(c.last_order_at || c.created_at)}</td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>
    </motion.div>
  )
}
