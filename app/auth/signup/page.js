'use client'
import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { Suspense } from 'react'

function SignupForm() {
  const searchParams = useSearchParams()
  const [form, setForm] = useState({
    token: searchParams.get('token') || '',
    name: '',
    email: '',
    password: '',
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Signup failed')
      router.push('/portal/dashboard')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#f2f2f7] dark:bg-[#1c1c1e] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-md"
      >
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 mb-3">
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
              <rect width="32" height="32" rx="8" fill="#0A84FF"/>
              <path d="M8 8h10v2H10v12H8V8zM12 12h12v2H14v8h-2V12z" fill="white"/>
            </svg>
            <span className="text-2xl font-black tracking-[-0.02em] text-[#1c1c1e] dark:text-[#f5f5f7]">Quoflow</span>
          </div>
          <h1 className="text-3xl font-black tracking-[-0.02em] text-[#1c1c1e] dark:text-[#f5f5f7]">Create account</h1>
          <p className="text-[#8e8e93] mt-1">You need an invite to sign up</p>
        </div>

        <div className="bg-white/80 dark:bg-zinc-900/70 backdrop-blur-xl border border-white/60 dark:border-white/10 shadow-sm rounded-2xl p-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            {[
              { label: 'Invite Token', key: 'token', type: 'text', placeholder: 'Paste your invite token' },
              { label: 'Full Name', key: 'name', type: 'text', placeholder: 'Your name' },
              { label: 'Email', key: 'email', type: 'email', placeholder: 'you@yourcompany.co.nz' },
              { label: 'Password', key: 'password', type: 'password', placeholder: '••••••••' },
            ].map(field => (
              <div key={field.key}>
                <label className="text-xs font-semibold tracking-[0.12em] uppercase text-[#8e8e93] block mb-2">
                  {field.label}
                </label>
                <input
                  type={field.type}
                  value={form[field.key]}
                  onChange={e => setForm(f => ({ ...f, [field.key]: e.target.value }))}
                  required
                  placeholder={field.placeholder}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-zinc-800 text-[#1c1c1e] dark:text-[#f5f5f7] placeholder-[#8e8e93] focus:ring-2 focus:ring-[#0A84FF]/20 focus:border-[#0A84FF] outline-none transition-all"
                />
              </div>
            ))}

            {error && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-xl text-sm"
              >
                {error}
              </motion.div>
            )}

            <motion.button
              type="submit"
              disabled={loading}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
              className="w-full bg-[#0A84FF] hover:bg-[#0070d6] text-white font-semibold py-3.5 rounded-xl transition-all disabled:opacity-50"
            >
              {loading ? 'Creating account…' : 'Create account'}
            </motion.button>
          </form>

          <div className="mt-6 pt-6 border-t border-gray-100 dark:border-white/10 text-center">
            <Link href="/auth/login" className="text-sm text-[#0A84FF] font-medium hover:underline">
              ← Back to login
            </Link>
          </div>
        </div>
      </motion.div>
    </div>
  )
}

export default function SignupPage() {
  return (
    <Suspense>
      <SignupForm />
    </Suspense>
  )
}
