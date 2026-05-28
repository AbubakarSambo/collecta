import { useQuery } from '@tanstack/react-query'
import { AlertTriangle, Activity, ExternalLink } from 'lucide-react'
import { adminApi } from '@/api/admin'
import { PageHeader } from '@/components/shared/PageHeader'
import { FullPageSpinner } from '@/components/ui/Spinner'
import { formatDate } from '@/lib/utils'
import { cn } from '@/lib/utils'

const SIGNAL_META: Record<string, { label: string; color: string; description: string }> = {
  HIGH_FEE_AMOUNT: {
    label: 'High Fee Amount',
    color: 'bg-orange-100 text-orange-700',
    description: 'A fee amount exceeds the expected ceiling for this organisation type.',
  },
  RAPID_MEMBER_GROWTH: {
    label: 'Rapid Member Growth',
    color: 'bg-red-100 text-red-700',
    description: '50+ members were added within 24 hours — may indicate bulk synthetic activity.',
  },
}

export function AdminMonitoringPage() {
  const { data, isLoading, dataUpdatedAt, refetch } = useQuery({
    queryKey: ['admin', 'monitoring'],
    queryFn: () => adminApi.getMonitoringSignals(),
    select: (r) => r.data?.data,
    refetchInterval: 60000,
  })

  const signals = data?.signals ?? []

  if (isLoading) return <FullPageSpinner />

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title="Monitoring Signals"
        description={
          dataUpdatedAt
            ? `Last checked ${formatDate(new Date(dataUpdatedAt).toISOString())}`
            : 'Post-approval anomaly detection'
        }
      />

      {signals.length === 0 ? (
        <div className="rounded-lg border bg-white p-12 text-center">
          <Activity className="mx-auto h-10 w-10 text-green-500 mb-3" />
          <p className="text-gray-900 font-medium">All clear</p>
          <p className="text-sm text-gray-500 mt-1">No anomalous signals detected across approved networks.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {signals.map((s: any, i: number) => {
            const meta = SIGNAL_META[s.signal]
            return (
              <div key={i} className="rounded-lg border bg-white p-5">
                <div className="flex items-start gap-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-50">
                    <AlertTriangle className="h-5 w-5 text-red-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-semibold text-gray-900">{s.networkName}</p>
                      <span className={cn('inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium', meta?.color ?? 'bg-gray-100 text-gray-600')}>
                        {meta?.label ?? s.signal.replace(/_/g, ' ')}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">{s.detail}</p>
                    {meta?.description && (
                      <p className="text-xs text-gray-400 mt-1">{meta.description}</p>
                    )}
                  </div>
                  <a
                    href={`/pay/${s.slug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800 shrink-0"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    Portal
                  </a>
                </div>
              </div>
            )
          })}
        </div>
      )}

      <div className="text-right">
        <button
          onClick={() => refetch()}
          className="text-xs text-gray-400 hover:text-gray-600 underline"
        >
          Refresh signals
        </button>
      </div>
    </div>
  )
}
