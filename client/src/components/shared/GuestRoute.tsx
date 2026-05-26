import { Navigate, Outlet } from 'react-router-dom'
import { useAuthStore } from '@/stores/auth.store'

export function GuestRoute() {
  const { isAuthenticated, _hasHydrated, user } = useAuthStore()

  if (!_hasHydrated) {
    return null
  }

  if (isAuthenticated) {
    return <Navigate to={user?.isPlatformAdmin ? '/admin' : '/dashboard'} replace />
  }

  return <Outlet />
}
