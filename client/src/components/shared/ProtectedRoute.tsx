import { Navigate, Outlet } from 'react-router-dom'
import { useAuthStore } from '@/stores/auth.store'
import { FullPageSpinner } from '@/components/ui/Spinner'

export function ProtectedRoute() {
  const { isAuthenticated, _hasHydrated, user } = useAuthStore()

  if (!_hasHydrated) {
    return <FullPageSpinner />
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  // Platform admins have no network — send them to their own dashboard
  if (user?.isPlatformAdmin) {
    return <Navigate to="/admin" replace />
  }

  return <Outlet />
}
