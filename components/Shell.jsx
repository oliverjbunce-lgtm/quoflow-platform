'use client'
import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Sidebar from './Sidebar'
import TopBar from './TopBar'

export default function Shell({ children }) {
  const [user, setUser] = useState(null)
  const [tenant, setTenant] = useState(null)
  const [pendingCount, setPendingCount] = useState(0)
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    fetch('/api/auth/me')
      .then(r => r.json())
      .then(d => {
        setUser(d.user)
        setTenant(d.tenant)
      })
      .catch(() => {})

    fetch('/api/quotes?status=pending')
      .then(r => r.json())
      .then(d => setPendingCount(d.quotes?.length || 0))
      .catch(() => {})
  }, [])

  return (
    <div className="min-h-screen bg-[#f2f2f7] dark:bg-[#1c1c1e]">
      {/* Mobile overlay */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setMobileOpen(false)}
            className="fixed inset-0 bg-black/30 backdrop-blur-sm z-30 md:hidden"
          />
        )}
      </AnimatePresence>

      {/* Desktop sidebar */}
      <div className="hidden md:block">
        <Sidebar user={user} tenant={tenant} pendingCount={pendingCount} />
      </div>

      {/* Mobile sidebar */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ x: -240 }}
            animate={{ x: 0 }}
            exit={{ x: -240 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            className="fixed left-0 top-0 bottom-0 z-40 md:hidden"
          >
            <Sidebar
              user={user}
              tenant={tenant}
              pendingCount={pendingCount}
              onClose={() => setMobileOpen(false)}
            />
          </motion.div>
        )}
      </AnimatePresence>

      <TopBar user={user} onMenuOpen={() => setMobileOpen(true)} />

      {/* Main content */}
      <main className="md:ml-60 pt-14 min-h-screen">
        <div className="p-6 max-w-7xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  )
}
