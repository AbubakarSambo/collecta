import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Search, ExternalLink } from 'lucide-react'
import { adminApi } from '@/api/admin'
import { PageHeader } from '@/components/shared/PageHeader'
import { Input } from '@/components/ui/Input'
import { StatusBadge } from '@/components/ui/Badge'
import { formatDate } from '@/lib/utils'
import { FullPageSpinner } from '@/components/ui/Spinner'
import { useDebounce } from '@/hooks/useDebounce'
import { Button } from '@/components/ui/Button'

const TYPE_COLORS: Record<string, string> = {
  ESTATE: 'bg-blue-100 text-blue-700',
  CHAMA: 'bg-purple-100 text-purple-700',
  SUPPLIER: 'bg-orange-100 text-orange-700',
  DEBT: 'bg-red-100 text-red-700',
}

export function AdminNetworksPage() {
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebounce(search, 300)

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'networks', page, debouncedSearch],
    queryFn: () => adminApi.getAllNetworks({ page, search: debouncedSearch || undefined }),
    select: (r) => r.data?.data,
  })

  const networks = data?.data ?? []
  const meta = data?.meta

  const handleSearch = (value: string) => {
    setSearch(value)
    setPage(1)
  }

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title="All Networks"
        description={meta ? `${meta.total} networks on the platform` : 'All registered networks'}
      />

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          className="pl-9"
          placeholder="Search by name, slug, or admin email..."
          value={search}
          onChange={(e) => handleSearch(e.target.value)}
        />
      </div>

      {isLoading ? (
        <FullPageSpinner />
      ) : (
        <div className="rounded-lg border bg-white overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                {['Organisation', 'Type', 'Status', 'Admin', 'Members', 'Fees', 'Created', 'Portal'].map((h) => (
                  <th
                    key={h}
                    className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {networks.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-10 text-center text-sm text-gray-500">
                    No networks found
                  </td>
                </tr>
              ) : (
                networks.map((n: any) => (
                  <tr key={n.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <p className="text-sm font-medium text-gray-900">{n.name}</p>
                      <p className="text-xs text-gray-400 font-mono">{n.slug}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${TYPE_COLORS[n.networkType] ?? 'bg-gray-100 text-gray-700'}`}>
                        {n.networkType}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={n.verificationStatus ?? 'NONE'} />
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-sm text-gray-700">{n.admin?.firstName} {n.admin?.lastName}</p>
                      <p className="text-xs text-gray-400">{n.admin?.email}</p>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">{n._count?.members ?? 0}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">{n._count?.fees ?? 0}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">{formatDate(n.createdAt)}</td>
                    <td className="px-4 py-3">
                      {n.verificationStatus === 'APPROVED' && (
                        <a
                          href={`/pay/${n.slug}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                          Portal
                        </a>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>

          {/* Pagination */}
          {meta && meta.totalPages > 1 && (
            <div className="flex items-center justify-between border-t px-4 py-3">
              <p className="text-sm text-gray-500">
                Page {meta.page} of {meta.totalPages} · {meta.total} total
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={meta.page === 1}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => p + 1)}
                  disabled={meta.page >= meta.totalPages}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
