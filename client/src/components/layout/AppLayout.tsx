import { useState, useEffect } from 'react'
import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { Header } from './Header'
import { useAuthStore } from '@/stores/auth.store'
import { useAnalytics } from '@/hooks/useAnalytics'

export function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const user = useAuthStore((s) => s.user)
  const { identify } = useAnalytics()

  useEffect(() => {
    if (user?.id) {
      identify(String(user.id), {
        email: user.email,
        name: `${user.firstName} ${user.lastName}`,
        networkId: (user as any).networkId,
        networkName: (user as any).networkName,
      })
    }
  }, [user?.id])

  return (
    <div className="flex h-screen overflow-hidden bg-surface">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex flex-1 flex-col overflow-hidden">
        <Header onMenuClick={() => setSidebarOpen(true)} />

        <main className="flex-1 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
