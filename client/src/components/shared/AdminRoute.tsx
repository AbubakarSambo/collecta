import { Navigate, Outlet } from 'react-router-dom'
import { useAuthStore } from '@/stores/auth.store'
import { FullPageSpinner } from '@/components/ui/Spinner'

export function AdminRoute() {
  const { isAuthenticated, _hasHydrated, user } = useAuthStore()

  if (!_hasHydrated) {
    return <FullPageSpinner />
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  if (!user?.isPlatformAdmin) {
    return <Navigate to="/dashboard" replace />
  }

  return <Outlet />
}
