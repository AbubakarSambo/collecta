import { Navigate, Outlet } from 'react-router-dom'
import { useAuthStore } from '@/stores/auth.store'
import { FullPageSpinner } from '@/components/ui/Spinner'

export function ProtectedRoute() {
  const { isAuthenticated, _hasHydrated } = useAuthStore()

  if (!_hasHydrated) {
    return <FullPageSpinner />
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  return <Outlet />
}
