'use client'
import { motion, AnimatePresence } from 'framer-motion'
import { usePathname, useRouter } from 'next/navigation'
import ThemeToggle from './ThemeToggle'
import { useState, useEffect, useRef } from 'react'
import { Bell } from 'lucide-react'

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

function timeAgo(timestamp) {
  const seconds = Math.floor(Date.now() / 1000) - timestamp
  if (seconds < 60) return 'just now'
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
  return `${Math.floor(seconds / 86400)}d ago`
}

export default function TopBar({ user, onMenuOpen }) {
  const pathname = usePathname()
  const router = useRouter()
  const [loggingOut, setLoggingOut] = useState(false)
  const [notifications, setNotifications] = useState([])
  const [showNotifications, setShowNotifications] = useState(false)
  const bellRef = useRef(null)

  const title = PAGE_TITLES[pathname] ||
    (pathname.startsWith('/admin/quotes/') ? 'Quote Detail' : 'Quoflow')

  const unread = notifications.filter(n => !n.read).length

  useEffect(() => {
    fetchNotifications()
    const interval = setInterval(fetchNotifications, 30000)
    return () => clearInterval(interval)
  }, [])

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e) {
      if (bellRef.current && !bellRef.current.contains(e.target)) {
        setShowNotifications(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  async function fetchNotifications() {
    try {
      const res = await fetch('/api/notifications')
      if (res.ok) {
        const data = await res.json()
        setNotifications(data.notifications || [])
      }
    } catch {}
  }

  async function markRead(id) {
    try {
      await fetch(`/api/notifications/${id}/read`, { method: 'POST' })
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: 1 } : n))
    } catch {}
  }

  async function markAllRead() {
    try {
      await fetch('/api/notifications/read-all', { method: 'POST' })
      setNotifications(prev => prev.map(n => ({ ...n, read: 1 })))
    } catch {}
  }

  async function handleLogout() {
    setLoggingOut(true)
    await fetch('/api/auth/logout', { method: 'POST' })
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
          className="text-lg font-bold tracking-[-0.02em] text-[#1c1c1e] dark:text-[#f5f5f7]"
        >
          {title}
        </motion.h1>
      </AnimatePresence>

      <div className="flex-1" />

      <div className="flex items-center gap-2">
        <ThemeToggle />

        {/* Notification bell */}
        <div className="relative" ref={bellRef}>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-white/5 transition-colors"
          >
            <Bell size={20} strokeWidth={1.5} className="text-gray-600 dark:text-gray-300" />
            {unread > 0 && (
              <span className="absolute top-1 right-1 w-4 h-4 bg-[#0A84FF] text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                {unread > 9 ? '9+' : unread}
              </span>
            )}
          </motion.button>

          {/* Dropdown */}
          {showNotifications && (
            <div className="absolute right-0 top-12 w-80 bg-white dark:bg-zinc-900 rounded-2xl shadow-xl border border-gray-200 dark:border-white/10 overflow-hidden z-50">
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-white/5">
                <span className="font-semibold text-sm text-[#1c1c1e] dark:text-[#f5f5f7]">Notifications</span>
                <button onClick={markAllRead} className="text-xs text-[#0A84FF] hover:text-[#0070d6]">Mark all read</button>
              </div>
              <div className="max-h-96 overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="py-12 text-center text-sm text-gray-400">No notifications</div>
                ) : notifications.map(n => (
                  <div
                    key={n.id}
                    onClick={() => {
                      markRead(n.id)
                      if (n.link) router.push(n.link)
                      setShowNotifications(false)
                    }}
                    className={`px-4 py-3 border-b border-gray-50 dark:border-white/5 cursor-pointer hover:bg-gray-50 dark:hover:bg-white/5 transition-colors ${!n.read ? 'bg-blue-50/50 dark:bg-blue-950/20' : ''}`}
                  >
                    <p className="text-sm font-medium text-[#1c1c1e] dark:text-[#f5f5f7]">{n.title}</p>
                    {n.body && <p className="text-xs text-gray-500 mt-0.5">{n.body}</p>}
                    <p className="text-xs text-gray-400 mt-1">{timeAgo(n.created_at)}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

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
