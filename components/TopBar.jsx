'use client'
import { motion, AnimatePresence } from 'framer-motion'
import { usePathname, useRouter } from 'next/navigation'
import ThemeToggle from './ThemeToggle'
import { useState } from 'react'

const PAGE_TITLES = {
  '/admin/dashboard': 'Dashboard',
  '/admin/analyse': 'Analyse',
  '/admin/quotes': 'Quotes',
  '/admin/orders': 'Orders',
  '/admin/clients': 'Clients',
  '/admin/analytics': 'Analytics',
  '/admin/integrations': 'Integrations',
  '/admin/settings': 'Settings',
}

export default function TopBar({ user, onMenuOpen }) {
  const pathname = usePathname()
  const router = useRouter()
  const [loggingOut, setLoggingOut] = useState(false)

  const title = PAGE_TITLES[pathname] || 
    (pathname.startsWith('/admin/quotes/') ? 'Quote Detail' : 'Quoflow')

  async function handleLogout() {
    setLoggingOut(true)
    await fetch('/api/auth/me', { method: 'DELETE' })
    router.push('/auth/login')
  }

  return (
    <header className="fixed top-0 left-0 right-0 md:left-60 h-14 bg-white/70 dark:bg-zinc-900/70 backdrop-blur-2xl border-b border-gray-200/50 dark:border-white/10 flex items-center px-5 gap-4 z-30">
      {/* Mobile menu button */}
      <button
        onClick={onMenuOpen}
        className="md:hidden w-9 h-9 rounded-xl flex items-center justify-center bg-gray-100 dark:bg-zinc-800 text-gray-600 dark:text-gray-300"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>
        </svg>
      </button>

      <AnimatePresence mode="wait">
        <motion.h1
          key={title}
          initial={{ opacity: 0, x: -8 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 8 }}
          transition={{ duration: 0.2 }}
          className="text-lg font-black tracking-[-0.02em] text-[#1c1c1e] dark:text-[#f5f5f7]"
        >
          {title}
        </motion.h1>
      </AnimatePresence>

      <div className="flex-1" />

      <div className="flex items-center gap-2">
        <ThemeToggle />

        {/* Notification bell */}
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="relative w-9 h-9 rounded-xl flex items-center justify-center bg-gray-100 dark:bg-zinc-800 text-gray-600 dark:text-gray-300"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
            <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
          </svg>
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-[#0A84FF] rounded-full" />
        </motion.button>

        {/* User avatar */}
        {user && (
          <div className="relative group">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="w-9 h-9 rounded-full bg-[#0A84FF] flex items-center justify-center text-white font-bold text-sm"
            >
              {user.name?.charAt(0)?.toUpperCase() || 'U'}
            </motion.button>
            <div className="absolute right-0 top-full mt-2 w-48 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-white/10 rounded-2xl shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 p-1">
              <div className="px-3 py-2 border-b border-gray-100 dark:border-white/10 mb-1">
                <div className="text-sm font-semibold text-[#1c1c1e] dark:text-[#f5f5f7] truncate">{user.name}</div>
                <div className="text-xs text-[#8e8e93] truncate">{user.email}</div>
              </div>
              <button
                onClick={handleLogout}
                disabled={loggingOut}
                className="w-full text-left px-3 py-2 text-sm text-[#ff3b30] hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-colors"
              >
                {loggingOut ? 'Signing out…' : 'Sign out'}
              </button>
            </div>
          </div>
        )}
      </div>
    </header>
  )
}
