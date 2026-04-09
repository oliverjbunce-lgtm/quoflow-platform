'use client'
import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import ThemeToggle from '@/components/ThemeToggle'

export default function PortalLayout({ children }) {
  const [user, setUser] = useState(null)
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    fetch('/api/auth/me')
      .then(r => r.json())
      .then(d => setUser(d.user))
      .catch(() => {})
  }, [])

  async function logout() {
    await fetch('/api/auth/me', { method: 'DELETE' })
    router.push('/auth/login')
  }

  const navLinks = [
    { href: '/portal/dashboard', label: 'Dashboard' },
    { href: '/portal/submit', label: 'Submit Plan' },
    { href: '/portal/quotes', label: 'Quotes' },
    { href: '/portal/orders', label: 'Orders' },
  ]

  return (
    <div className="min-h-screen bg-white dark:bg-[#1c1c1e]">
      <header className="border-b border-gray-100 dark:border-white/10 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl sticky top-0 z-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center gap-6">
          <Link href="/portal/dashboard" className="flex items-center gap-2 flex-shrink-0">
            <div className="w-7 h-7 rounded-lg bg-[#0A84FF] flex items-center justify-center">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                <path d="M4 4h8v2H6v10H4V4zM8 8h12v2H10v6H8V8z" fill="white"/>
              </svg>
            </div>
            <span className="font-bold text-[#1c1c1e] dark:text-[#f5f5f7]">Quoflow</span>
          </Link>

          <nav className="hidden sm:flex items-center gap-1 flex-1">
            {navLinks.map(link => (
              <Link
                key={link.href}
                href={link.href}
                className={`px-3 py-1.5 text-sm font-semibold rounded-lg transition-colors ${
                  pathname === link.href
                    ? 'bg-[#0A84FF]/10 text-[#0A84FF]'
                    : 'text-[#8e8e93] hover:text-[#1c1c1e] dark:hover:text-[#f5f5f7]'
                }`}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-2 ml-auto">
            <ThemeToggle />
            {user && (
              <div className="relative group">
                <button className="w-8 h-8 rounded-full bg-[#0A84FF] flex items-center justify-center text-white font-bold text-xs">
                  {user.name?.charAt(0)?.toUpperCase()}
                </button>
                <div className="absolute right-0 top-full mt-2 w-48 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-white/10 rounded-xl shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all p-1 z-50">
                  <div className="px-3 py-2 border-b border-gray-100 dark:border-white/10 mb-1">
                    <p className="text-sm font-semibold text-[#1c1c1e] dark:text-[#f5f5f7] truncate">{user.name}</p>
                  </div>
                  <Link href="/portal/settings" className="block px-3 py-2 text-sm text-[#8e8e93] hover:bg-gray-50 dark:hover:bg-zinc-800 rounded-lg">Settings</Link>
                  <button onClick={logout} className="w-full text-left px-3 py-2 text-sm text-[#ff3b30] hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg">Sign out</button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        {children}
      </main>
    </div>
  )
}
