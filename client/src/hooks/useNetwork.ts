import { useAuthStore } from '@/stores/auth.store'
import { useQuery } from '@tanstack/react-query'
import { networksApi } from '@/api/networks'

export function useNetwork() {
  const user = useAuthStore((s) => s.user)

  const { data, isLoading, error } = useQuery({
    queryKey: ['network', 'me'],
    queryFn: () => networksApi.getMyNetwork(),
    enabled: !!user,
    select: (res) => res.data,
  })

  return {
    network: data,
    networkId: data?.id || user?.networkId,
    isLoading,
    error,
  }
}
