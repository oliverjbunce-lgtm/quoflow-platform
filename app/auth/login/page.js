'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import Link from 'next/link'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Login failed')
      
      // Redirect based on role
      if (['admin', 'staff'].includes(data.user.role)) {
        router.push('/admin/dashboard')
      } else {
        router.push('/portal/dashboard')
      }
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
        {/* Logo */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 mb-3">
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
              <rect width="32" height="32" rx="8" fill="#0A84FF"/>
              <path d="M8 8h10v2H10v12H8V8zM12 12h12v2H14v8h-2V12z" fill="white"/>
            </svg>
            <span className="text-2xl font-bold tracking-[-0.02em] text-[#1c1c1e] dark:text-[#f5f5f7]">Quoflow</span>
          </div>
          <h1 className="text-3xl font-bold tracking-[-0.02em] text-[#1c1c1e] dark:text-[#f5f5f7]">Welcome back</h1>
          <p className="text-[#8e8e93] mt-1">Sign in to your account</p>
        </div>

        <div className="bg-white/80 dark:bg-zinc-900/70 backdrop-blur-xl border border-white/60 dark:border-white/10 shadow-sm rounded-2xl p-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="text-xs font-semibold tracking-[0.12em] uppercase text-[#8e8e93] block mb-2">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                placeholder="admin@quoflow.co.nz"
                className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-zinc-800 text-[#1c1c1e] dark:text-[#f5f5f7] placeholder-[#8e8e93] focus:ring-2 focus:ring-[#0A84FF]/20 focus:border-[#0A84FF] outline-none transition-all"
              />
            </div>

            <div>
              <label className="text-xs font-semibold tracking-[0.12em] uppercase text-[#8e8e93] block mb-2">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                placeholder="••••••••"
                className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-zinc-800 text-[#1c1c1e] dark:text-[#f5f5f7] placeholder-[#8e8e93] focus:ring-2 focus:ring-[#0A84FF]/20 focus:border-[#0A84FF] outline-none transition-all"
              />
            </div>

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
              className="w-full bg-[#0A84FF] hover:bg-[#0070d6] text-white font-semibold py-3.5 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Signing in…
                </span>
              ) : 'Sign in'}
            </motion.button>
          </form>

          <div className="mt-6 pt-6 border-t border-gray-100 dark:border-white/10 text-center">
            <p className="text-sm text-[#8e8e93]">
              Builder account?{' '}
              <Link href="/auth/signup" className="text-[#0A84FF] font-medium hover:underline">
                Sign up with invite
              </Link>
            </p>
          </div>
        </div>

        {/* Demo credentials */}
        <div className="mt-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-2xl p-4 text-sm">
          <p className="font-semibold text-blue-800 dark:text-blue-300 mb-2">Demo credentials</p>
          <p className="text-blue-700 dark:text-blue-400">Admin: <span className="font-mono">admin@quoflow.co.nz</span> / <span className="font-mono">demo1234</span></p>
          <p className="text-blue-700 dark:text-blue-400">Builder: <span className="font-mono">builder@acme.co.nz</span> / <span className="font-mono">demo1234</span></p>
        </div>
      </motion.div>
    </div>
  )
}
