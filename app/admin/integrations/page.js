'use client'
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Image from 'next/image'

const INTEGRATIONS = [
  { id: 'xero', name: 'Xero', category: 'Accounting', domain: 'xero.com', status: 'available', description: 'Sync invoices and quotes directly to Xero.' },
  { id: 'myob', name: 'MYOB', category: 'Accounting', domain: 'myob.com', status: 'available', description: 'Export quotes to MYOB AccountRight.' },
  { id: 'jobmate', name: 'Jobmate', category: 'Quoting', domain: null, status: 'available', description: 'Push quotes to Jobmate for approval.' },
  { id: 'simpro', name: 'simPRO', category: 'Job Management', domain: 'simpro.com', status: 'available', description: 'Create jobs in simPRO from accepted quotes.' },
  { id: 'fergus', name: 'Fergus', category: 'Trade Software', domain: 'fergus.com', status: 'available', description: 'Sync jobs and materials with Fergus.' },
  { id: 'zapier', name: 'Zapier', category: 'Automation', domain: 'zapier.com', status: 'available', description: 'Trigger Zaps on quote and order events.' },
  { id: 'gdrive', name: 'Google Drive', category: 'File Storage', domain: 'google.com', status: 'available', description: 'Save floor plans and quotes to Google Drive.' },
  { id: 'xero-payroll', name: 'Xero Payroll', category: 'Payroll', domain: 'xero.com', status: 'coming_soon', description: 'Coming soon: payroll integration.' },
]

function IntegrationModal({ integration, onClose }) {
  const [fields, setFields] = useState({})
  const [connecting, setConnecting] = useState(false)
  const [connected, setConnected] = useState(false)
  const [error, setError] = useState('')

  const fieldConfig = {
    zapier: [{ key: 'webhook_url', label: 'Webhook URL', placeholder: 'https://hooks.zapier.com/hooks/catch/...' }],
    xero: [{ key: 'client_id', label: 'Client ID', placeholder: 'Xero OAuth2 Client ID' }, { key: 'client_secret', label: 'Client Secret', placeholder: '...' }],
    default: [{ key: 'api_key', label: 'API Key', placeholder: 'Paste your API key' }],
  }

  const formFields = fieldConfig[integration.id] || fieldConfig.default

  async function handleConnect() {
    setConnecting(true)
    setError('')
    try {
      await new Promise(r => setTimeout(r, 1200))
      setConnected(true)
    } catch (err) {
      setError('Connection failed. Check your credentials and try again.')
    } finally {
      setConnecting(false)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, y: 16 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.95 }}
        onClick={e => e.stopPropagation()}
        className="bg-white dark:bg-zinc-900 rounded-2xl p-6 w-full max-w-md shadow-2xl"
      >
        <div className="flex items-center gap-3 mb-5">
          {integration.domain ? (
            <Image
              src={`https://logo.clearbit.com/${integration.domain}`}
              alt={integration.name}
              width={40} height={40}
              className="rounded-xl"
              onError={e => { e.target.style.display = 'none' }}
            />
          ) : (
            <div className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-zinc-700 flex items-center justify-center text-lg font-black text-[#8e8e93]">
              {integration.name.charAt(0)}
            </div>
          )}
          <div>
            <h3 className="font-black text-[#1c1c1e] dark:text-[#f5f5f7]">Connect {integration.name}</h3>
            <p className="text-xs text-[#8e8e93]">{integration.category}</p>
          </div>
          <button onClick={onClose} className="ml-auto text-[#8e8e93] hover:text-[#1c1c1e] dark:hover:text-[#f5f5f7]">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        {connected ? (
          <div className="text-center py-4">
            <div className="w-12 h-12 rounded-full bg-[#34c759] flex items-center justify-center mx-auto mb-3">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
            </div>
            <p className="font-black text-[#34c759] text-lg">Connected!</p>
            <p className="text-sm text-[#8e8e93] mt-1">{integration.name} is now connected to Quoflow.</p>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-[#8e8e93]">{integration.description}</p>
            {formFields.map(field => (
              <div key={field.key}>
                <label className="text-xs font-semibold tracking-[0.08em] uppercase text-[#8e8e93] block mb-1.5">{field.label}</label>
                <input
                  value={fields[field.key] || ''}
                  onChange={e => setFields(f => ({ ...f, [field.key]: e.target.value }))}
                  placeholder={field.placeholder}
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-zinc-800 text-[#1c1c1e] dark:text-[#f5f5f7] text-sm focus:ring-2 focus:ring-[#0A84FF]/20 focus:border-[#0A84FF] outline-none"
                />
              </div>
            ))}
            {error && <p className="text-sm text-[#ff3b30]">{error}</p>}
            <motion.button
              onClick={handleConnect}
              disabled={connecting}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
              className="w-full py-3 bg-[#0A84FF] hover:bg-[#0070d6] text-white font-semibold rounded-xl transition-all disabled:opacity-50"
            >
              {connecting ? 'Connecting…' : `Connect ${integration.name}`}
            </motion.button>
          </div>
        )}
      </motion.div>
    </motion.div>
  )
}

export default function IntegrationsPage() {
  const [activeModal, setActiveModal] = useState(null)
  const [connectedIds, setConnectedIds] = useState([])

  const activeIntegration = INTEGRATIONS.find(i => i.id === activeModal)

  return (
    <>
      <AnimatePresence>
        {activeModal && activeIntegration && (
          <IntegrationModal
            integration={activeIntegration}
            onClose={() => setActiveModal(null)}
          />
        )}
      </AnimatePresence>

      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
        <div>
          <h2 className="text-2xl font-black tracking-[-0.02em] text-[#1c1c1e] dark:text-[#f5f5f7] mb-1">Integrations</h2>
          <p className="text-[#8e8e93]">Connect Quoflow with your existing tools</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {INTEGRATIONS.map((int, i) => (
            <motion.div
              key={int.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06 }}
              whileHover={{ scale: 1.01 }}
              className="bg-white/80 dark:bg-zinc-900/70 backdrop-blur-xl border border-white/60 dark:border-white/10 rounded-2xl p-5"
            >
              <div className="flex items-start gap-3 mb-3">
                <div className="w-12 h-12 rounded-xl bg-gray-50 dark:bg-zinc-800 flex items-center justify-center flex-shrink-0 overflow-hidden">
                  {int.domain ? (
                    <Image
                      src={`https://logo.clearbit.com/${int.domain}`}
                      alt={int.name}
                      width={32} height={32}
                      className="rounded"
                      onError={e => { e.target.style.display = 'none' }}
                    />
                  ) : (
                    <span className="text-xl font-black text-[#8e8e93]">{int.name.charAt(0)}</span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-black text-[#1c1c1e] dark:text-[#f5f5f7]">{int.name}</h3>
                    {connectedIds.includes(int.id) && (
                      <span className="text-xs bg-[#34c759]/20 text-[#34c759] font-semibold px-1.5 py-0.5 rounded-md">Connected</span>
                    )}
                  </div>
                  <p className="text-xs text-[#8e8e93]">{int.category}</p>
                </div>
              </div>

              <p className="text-sm text-[#8e8e93] mb-4">{int.description}</p>

              {int.status === 'coming_soon' ? (
                <span className="text-xs font-semibold text-[#8e8e93] bg-gray-100 dark:bg-zinc-800 px-3 py-1.5 rounded-lg">Coming Soon</span>
              ) : (
                <motion.button
                  onClick={() => setActiveModal(int.id)}
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.98 }}
                  className={`text-sm font-semibold px-4 py-2 rounded-xl transition-all ${
                    connectedIds.includes(int.id)
                      ? 'bg-gray-100 dark:bg-zinc-800 text-[#8e8e93] hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-[#ff3b30]'
                      : 'bg-[#0A84FF]/10 hover:bg-[#0A84FF] text-[#0A84FF] hover:text-white'
                  }`}
                >
                  {connectedIds.includes(int.id) ? 'Disconnect' : 'Connect'}
                </motion.button>
              )}
            </motion.div>
          ))}
        </div>
      </motion.div>
    </>
  )
}
