import { Outlet, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { portalApi } from '@/api/portal'

export function PortalLayout() {
  const { slug } = useParams<{ slug: string }>()

  const { data } = useQuery({
    queryKey: ['portal', slug],
    queryFn: () => portalApi.getNetwork(slug!),
    enabled: !!slug,
    select: (r) => r.data,
  })

  const network = data?.network

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b shadow-sm">
        <div className="mx-auto max-w-3xl px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {network?.logoUrl ? (
              <img src={network.logoUrl} alt={network.name} className="h-10 w-10 rounded-full object-cover" />
            ) : (
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100 text-green-700 font-bold text-lg">
                {network?.name?.charAt(0) || 'C'}
              </div>
            )}
            <div>
              <h1 className="text-lg font-semibold text-gray-900">{network?.name || 'Loading...'}</h1>
              {network?.description && (
                <p className="text-xs text-gray-500">{network.description}</p>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-8">
        <Outlet />
      </main>

      <footer className="mt-12 py-6 text-center text-xs text-gray-400">
        Powered by{' '}
        <a href="https://collecta.africa" className="text-green-600 hover:underline">
          Collecta
        </a>
      </footer>
    </div>
  )
}
