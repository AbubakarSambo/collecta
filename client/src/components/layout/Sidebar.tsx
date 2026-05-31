import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard,
  Users,
  Receipt,
  CreditCard,
  DollarSign,
  Bell,
  BarChart3,
  Settings,
  HelpCircle,
  X,
  Building2,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/stores/auth.store'

const navItems = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/members', icon: Users, label: 'Members' },
  { to: '/fees', icon: Receipt, label: 'Fees' },
  { to: '/charges', icon: CreditCard, label: 'Charges' },
  { to: '/payments', icon: DollarSign, label: 'Payments' },
  { to: '/reminders', icon: Bell, label: 'Reminders' },
  { to: '/reports', icon: BarChart3, label: 'Reports' },
  { to: '/settings', icon: Settings, label: 'Settings' },
  { to: '/faq', icon: HelpCircle, label: 'FAQ' },
]

interface SidebarProps {
  isOpen: boolean
  onClose: () => void
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const user = useAuthStore((s) => s.user)

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/50 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-30 flex w-64 flex-col bg-white border-r shadow-sm transition-transform duration-200',
          'lg:static lg:translate-x-0',
          isOpen ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        {/* Logo */}
        <div className="flex h-16 items-center justify-between px-6 border-b">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-black text-brand-500 text-sm font-bold font-display">
              C
            </div>
            <span className="text-lg font-bold text-gray-900 font-display">Collecta</span>
          </div>
          <button
            onClick={onClose}
            className="rounded-md p-1 text-gray-400 hover:text-gray-600 lg:hidden"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Network info */}
        {user?.networkName && (
          <div className="mx-4 mt-4 flex items-center gap-2 rounded-lg bg-brand-50 border border-brand-100 p-3">
            <Building2 className="h-4 w-4 text-brand-700 flex-shrink-0" />
            <div className="min-w-0">
              <p className="text-xs font-semibold text-gray-900 truncate">{user.networkName}</p>
              <p className="text-xs text-stone">{user.networkSlug}</p>
            </div>
          </div>
        )}

        {/* Nav */}
        <nav className="flex-1 space-y-1 px-4 py-4 overflow-y-auto">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={onClose}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-brand-50 text-black font-semibold'
                    : 'text-stone hover:bg-surface hover:text-black',
                )
              }
            >
              <item.icon className="h-4 w-4 flex-shrink-0" />
              {item.label}
            </NavLink>
          ))}
        </nav>

        {/* User */}
        <div className="border-t p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-100 text-brand-700 text-xs font-semibold">
              {user?.firstName?.charAt(0)}{user?.lastName?.charAt(0)}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-gray-900 truncate">
                {user?.firstName} {user?.lastName}
              </p>
              <p className="text-xs text-gray-500 truncate">{user?.email}</p>
            </div>
          </div>
        </div>
      </aside>
    </>
  )
}
