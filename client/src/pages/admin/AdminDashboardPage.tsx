import { useQuery } from '@tanstack/react-query'
import { Network, Users, DollarSign, ShieldCheck, Activity, AlertTriangle, TrendingUp } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { adminApi } from '@/api/admin'
import { StatsCard } from '@/components/shared/StatsCard'
import { PageHeader } from '@/components/shared/PageHeader'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { formatCurrency } from '@/lib/utils'
import { FullPageSpinner } from '@/components/ui/Spinner'
import { cn } from '@/lib/utils'

export function AdminDashboardPage() {
  const navigate = useNavigate()

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['admin', 'stats'],
    queryFn: () => adminApi.getStats(),
    select: (r) => r.data?.data,
  })

  const { data: signals, isLoading: signalsLoading } = useQuery({
    queryKey: ['admin', 'monitoring'],
    queryFn: () => adminApi.getMonitoringSignals(),
    select: (r) => r.data?.data,
  })

  const { data: verifications } = useQuery({
    queryKey: ['admin', 'verifications'],
    queryFn: () => adminApi.getPendingVerifications(),
    select: (r) => r.data?.data,
  })

  if (statsLoading) return <FullPageSpinner />

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title="Platform Overview"
        description="Collecta platform health and activity"
        action={
          <div className="flex gap-2">
            {(stats?.pendingVerifications ?? 0) > 0 && (
              <Button onClick={() => navigate('/admin/verifications')} size="sm">
                <ShieldCheck className="h-4 w-4" />
                Review {stats?.pendingVerifications} Pending
              </Button>
            )}
          </div>
        }
      />

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatsCard
          title="Total Networks"
          value={stats?.totalNetworks ?? 0}
          icon={Network}
          iconColor="text-indigo-600"
          iconBg="bg-indigo-100"
          description={`${stats?.approvedNetworks ?? 0} approved`}
        />
        <StatsCard
          title="Total Members"
          value={(stats?.totalMembers ?? 0).toLocaleString()}
          icon={Users}
          iconColor="text-blue-600"
          iconBg="bg-blue-100"
        />
        <StatsCard
          title="Pending Verification"
          value={stats?.pendingVerifications ?? 0}
          icon={ShieldCheck}
          iconColor={stats?.pendingVerifications ? 'text-amber-600' : 'text-gray-400'}
          iconBg={stats?.pendingVerifications ? 'bg-amber-100' : 'bg-gray-100'}
          description="awaiting review"
        />
        <StatsCard
          title="Total Payments"
          value={(stats?.totalPaymentsCount ?? 0).toLocaleString()}
          icon={TrendingUp}
          iconColor="text-green-600"
          iconBg="bg-green-100"
          description="all time"
        />
        <StatsCard
          title="Total Volume"
          value={formatCurrency(stats?.totalPaymentsVolume ?? 0)}
          icon={DollarSign}
          iconColor="text-green-600"
          iconBg="bg-green-100"
          description="all time"
        />
        <StatsCard
          title="Monitoring Alerts"
          value={signals?.signals?.length ?? 0}
          icon={Activity}
          iconColor={signals?.signals?.length ? 'text-red-600' : 'text-gray-400'}
          iconBg={signals?.signals?.length ? 'bg-red-100' : 'bg-gray-100'}
          description="active signals"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Pending verifications */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Pending Verifications</CardTitle>
            <Button variant="outline" size="sm" onClick={() => navigate('/admin/verifications')}>
              View all
            </Button>
          </CardHeader>
          <CardContent>
            {!verifications?.length ? (
              <p className="text-sm text-gray-500">No pending verifications</p>
            ) : (
              <div className="space-y-3">
                {verifications.slice(0, 5).map((v: any) => (
                  <div
                    key={v.id}
                    className="flex items-center justify-between rounded-lg border border-amber-100 bg-amber-50 px-4 py-3 cursor-pointer hover:bg-amber-100 transition-colors"
                    onClick={() => navigate('/admin/verifications')}
                  >
                    <div>
                      <p className="text-sm font-medium text-gray-900">{v.organisationName}</p>
                      <p className="text-xs text-gray-500">
                        {v.network?.networkType} · {v.network?.admin?.email}
                      </p>
                    </div>
                    <span className="text-xs text-amber-700 font-medium">Pending</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Monitoring signals */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Monitoring Signals</CardTitle>
            <Button variant="outline" size="sm" onClick={() => navigate('/admin/monitoring')}>
              View all
            </Button>
          </CardHeader>
          <CardContent>
            {signalsLoading ? (
              <p className="text-sm text-gray-500">Loading...</p>
            ) : !signals?.signals?.length ? (
              <div className="flex items-center gap-2 text-sm text-green-700">
                <Activity className="h-4 w-4" />
                No active signals — all clear
              </div>
            ) : (
              <div className="space-y-3">
                {signals.signals.slice(0, 5).map((s: any, i: number) => (
                  <div key={i} className="flex items-start gap-3 rounded-lg border border-red-100 bg-red-50 px-4 py-3">
                    <AlertTriangle className="h-4 w-4 text-red-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">{s.networkName}</p>
                      <p className="text-xs text-gray-600">{s.detail}</p>
                      <span className={cn(
                        'mt-1 inline-block text-xs font-medium px-1.5 py-0.5 rounded',
                        s.signal === 'HIGH_FEE_AMOUNT' ? 'bg-orange-100 text-orange-700' : 'bg-red-100 text-red-700'
                      )}>
                        {s.signal.replace(/_/g, ' ')}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
