import { useQuery } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Download } from 'lucide-react'
import { reportsApi } from '@/api/reports'
import { useNetwork } from '@/hooks/useNetwork'
import { PageHeader } from '@/components/shared/PageHeader'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { formatCurrency } from '@/lib/utils'
import { FullPageSpinner } from '@/components/ui/Spinner'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts'

export function ReportsPage() {
  const { networkId } = useNetwork()

  const { data: collectionData, isLoading: collectionLoading } = useQuery({
    queryKey: ['reports', 'collection', networkId],
    queryFn: () => reportsApi.collection(networkId!, 6),
    enabled: !!networkId,
    select: (r) => r.data,
  })

  const { data: complianceData, isLoading: complianceLoading } = useQuery({
    queryKey: ['reports', 'compliance', networkId],
    queryFn: () => reportsApi.memberCompliance(networkId!),
    enabled: !!networkId,
    select: (r) => r.data,
  })

  const handleExportExcel = async () => {
    try {
      const blob = await reportsApi.exportExcel(networkId!)
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'collecta-payments.csv'
      a.click()
    } catch {
      toast.error('Export failed')
    }
  }

  const handleExportPdf = async () => {
    try {
      const blob = await reportsApi.exportPdf(networkId!)
      const url = URL.createObjectURL(blob)
      window.open(url, '_blank')
    } catch {
      toast.error('Export failed')
    }
  }

  if (collectionLoading) return <FullPageSpinner />

  const trend = collectionData?.monthlyTrend || []
  const feeBreakdown = collectionData?.feeBreakdown || []
  const members = complianceData || []

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title="Reports"
        description="Collection and compliance insights"
        action={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleExportExcel}>
              <Download className="h-4 w-4" />
              Export CSV
            </Button>
            <Button variant="outline" size="sm" onClick={handleExportPdf}>
              <Download className="h-4 w-4" />
              Export PDF
            </Button>
          </div>
        }
      />

      {/* Monthly Trend */}
      <Card>
        <CardHeader>
          <CardTitle>6-Month Collection Trend</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={trend}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `₦${(v / 1000).toFixed(0)}k`} />
              <Tooltip formatter={(v: number) => formatCurrency(v)} />
              <Bar dataKey="collected" fill="#16a34a" name="Collected" radius={[3, 3, 0, 0]} />
              <Bar dataKey="outstanding" fill="#fbbf24" name="Outstanding" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Fee Breakdown */}
      {feeBreakdown.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Collection by Fee</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {feeBreakdown.map((fee: any) => (
                <div key={fee.feeId}>
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-sm font-medium">{fee.feeName}</p>
                    <div className="flex items-center gap-4">
                      <span className="text-xs text-gray-500">{fee.paidCount}/{fee.totalCount}</span>
                      <span className="text-sm font-semibold">{fee.complianceRate}%</span>
                    </div>
                  </div>
                  <div className="h-2 rounded-full bg-gray-100">
                    <div
                      className="h-2 rounded-full bg-green-500"
                      style={{ width: `${fee.complianceRate}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Member Compliance Table */}
      <Card>
        <CardHeader>
          <CardTitle>Member Compliance</CardTitle>
        </CardHeader>
        <CardContent>
          {complianceLoading ? (
            <p className="text-sm text-gray-500">Loading...</p>
          ) : members.length === 0 ? (
            <p className="text-sm text-gray-500">No data yet</p>
          ) : (
            <div className="overflow-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-gray-500">
                    <th className="pb-2 font-medium">Member</th>
                    <th className="pb-2 font-medium">Total</th>
                    <th className="pb-2 font-medium">Paid</th>
                    <th className="pb-2 font-medium">Overdue</th>
                    <th className="pb-2 font-medium">Outstanding</th>
                    <th className="pb-2 font-medium">Compliance</th>
                  </tr>
                </thead>
                <tbody>
                  {members.slice(0, 30).map((m: any) => (
                    <tr key={m.memberId} className="border-b last:border-0">
                      <td className="py-2">
                        <p className="font-medium">{m.firstName} {m.lastName}</p>
                        <p className="text-xs text-gray-500">{m.unit}</p>
                      </td>
                      <td className="py-2 text-gray-600">{m.chargesTotal}</td>
                      <td className="py-2 text-green-600">{m.chargesPaid}</td>
                      <td className="py-2 text-red-600">{m.chargesOverdue}</td>
                      <td className="py-2 font-medium">{formatCurrency(m.outstanding)}</td>
                      <td className="py-2">
                        <div className="flex items-center gap-2">
                          <div className="h-1.5 w-16 rounded-full bg-gray-100">
                            <div
                              className={`h-1.5 rounded-full ${m.compliancePercent >= 80 ? 'bg-green-500' : m.compliancePercent >= 50 ? 'bg-yellow-500' : 'bg-red-500'}`}
                              style={{ width: `${m.compliancePercent}%` }}
                            />
                          </div>
                          <span className="text-xs font-medium">{m.compliancePercent}%</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
