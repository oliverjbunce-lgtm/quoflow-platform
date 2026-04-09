'use client'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, ScanLine, FileText, Package, Users,
  BarChart3, Plug, Settings, LogOut,
} from 'lucide-react'

const NAV_ITEMS = [
  { label: 'Dashboard', href: '/admin/dashboard', Icon: LayoutDashboard },
  { label: 'Analyse', href: '/admin/analyse', badge: 'New', Icon: ScanLine },
  { label: 'Quotes', href: '/admin/quotes', Icon: FileText },
  { label: 'Orders', href: '/admin/orders', Icon: Package },
  { label: 'Clients', href: '/admin/clients', Icon: Users },
  { label: 'Analytics', href: '/admin/analytics', Icon: BarChart3 },
  { label: 'Integrations', href: '/admin/integrations', Icon: Plug },
  { label: 'Settings', href: '/admin/settings', Icon: Settings },
]

export default function Sidebar({ user, tenant, pendingCount = 0, analysisRunning = false, onClose }) {
  const pathname = usePathname()

  return (
    <aside className="fixed left-0 top-0 bottom-0 w-60 bg-white/70 dark:bg-zinc-900/70 backdrop-blur-2xl border-r border-gray-200/50 dark:border-white/10 flex flex-col z-40">
      {/* Logo */}
      <div className="px-5 pt-6 pb-4">
        <Link href="/admin/dashboard" className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-[#0A84FF] flex items-center justify-center flex-shrink-0">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M4 4h8v2H6v10H4V4zM8 8h12v2H10v6H8V8z" fill="white"/>
            </svg>
          </div>
          <span className="text-xl font-bold tracking-tight text-[#1c1c1e] dark:text-[#f5f5f7]">Quoflow</span>
        </Link>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-2 space-y-0.5 overflow-y-auto">
        {NAV_ITEMS.map(navItem => {
          const { label, href, badge, Icon } = navItem
          const isActive = pathname === href || pathname.startsWith(href + '/')
          const showBadge = label === 'Quotes' && pendingCount > 0

          return (
            <Link
              key={href}
              href={href}
              onClick={onClose}
              className="relative flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors group"
            >
              {isActive && (
                <motion.div
                  layoutId="sidebar-pill"
                  className="absolute inset-0 bg-[#0A84FF]/10 dark:bg-[#0A84FF]/15 rounded-xl"
                  initial={false}
                  transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                />
              )}
              <span className={`relative z-10 transition-colors ${
                isActive ? 'text-[#0A84FF]' : 'text-[#8e8e93] group-hover:text-[#1c1c1e] dark:group-hover:text-[#f5f5f7]'
              }`}>
                <Icon size={20} strokeWidth={1.5} />
              </span>
              <span className={`relative z-10 text-sm font-semibold transition-colors ${
                isActive ? 'text-[#0A84FF]' : 'text-[#8e8e93] group-hover:text-[#1c1c1e] dark:group-hover:text-[#f5f5f7]'
              }`}>
                {label}
              </span>

              {/* Badges */}
              {badge && (
                <span className="relative z-10 ml-auto text-xs font-semibold bg-[#0A84FF] text-white px-1.5 py-0.5 rounded-md">
                  {badge}
                </span>
              )}
              {showBadge && (
                <span className="relative z-10 ml-auto text-xs font-semibold bg-amber-500 text-white px-1.5 py-0.5 rounded-full min-w-[20px] text-center">
                  {pendingCount}
                </span>
              )}
              {label === 'Analyse' && analysisRunning && (
                <span className="relative z-10 ml-auto w-2 h-2 rounded-full bg-[#0A84FF] animate-pulse" />
              )}
            </Link>
          )
        })}
      </nav>

      {/* Bottom user area */}
      <div className="px-4 pb-5 pt-3 border-t border-gray-200/50 dark:border-white/10">
        {tenant && (
          <div className="text-xs text-[#8e8e93] mb-3 font-medium truncate">{tenant.name}</div>
        )}
        {user && (
          <div className="flex items-center gap-2.5 mb-3">
            <div className="w-8 h-8 rounded-full bg-[#0A84FF] flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
              {user.name?.charAt(0)?.toUpperCase() || 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold text-[#1c1c1e] dark:text-[#f5f5f7] truncate">{user.name}</div>
              <div className="text-xs text-[#8e8e93] capitalize">{user.role}</div>
            </div>
          </div>
        )}
        <button
          onClick={async () => {
            await fetch('/api/auth/logout', { method: 'POST' })
            window.location.href = '/auth/login'
          }}
          className="flex items-center gap-2.5 w-full px-3 py-2 rounded-xl text-sm text-gray-500 dark:text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors group"
        >
          <LogOut size={16} strokeWidth={1.5} className="group-hover:text-red-500" />
          <span>Sign out</span>
        </button>
      </div>
    </aside>
  )
}
