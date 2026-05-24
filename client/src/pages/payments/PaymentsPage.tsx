import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { paymentsApi } from '@/api/payments'
import { useNetwork } from '@/hooks/useNetwork'
import { PageHeader } from '@/components/shared/PageHeader'
import { DataTable, Column } from '@/components/shared/DataTable'
import { StatusBadge } from '@/components/ui/Badge'
import { formatCurrency, formatDate } from '@/lib/utils'
import type { Payment } from '@/types'

export function PaymentsPage() {
  const { networkId } = useNetwork()
  const [page, setPage] = useState(1)

  const { data, isLoading } = useQuery({
    queryKey: ['payments', networkId, page],
    queryFn: () => paymentsApi.list(networkId!, { page }),
    enabled: !!networkId,
    select: (r) => r.data,
  })

  const columns: Column<Payment>[] = [
    {
      key: 'member',
      header: 'Member',
      render: (row) => (
        <div>
          <p className="font-medium">{(row as any).member?.firstName} {(row as any).member?.lastName}</p>
          <p className="text-xs text-gray-500">{(row as any).member?.unit}</p>
        </div>
      ),
    },
    {
      key: 'fee',
      header: 'Fee',
      render: (row) => (
        <span className="text-sm">{(row as any).charge?.fee?.name || (row as any).charge?.description || '—'}</span>
      ),
    },
    {
      key: 'amount',
      header: 'Amount',
      render: (row) => <span className="font-semibold text-green-700">{formatCurrency(Number(row.amount))}</span>,
    },
    {
      key: 'method',
      header: 'Method',
      render: (row) => <StatusBadge status={row.method} />,
    },
    {
      key: 'date',
      header: 'Date',
      render: (row) => <span className="text-sm text-gray-500">{formatDate(row.createdAt)}</span>,
    },
    {
      key: 'reference',
      header: 'Reference',
      render: (row) => (
        <span className="text-xs text-gray-400 font-mono">{row.paystackReference || '—'}</span>
      ),
    },
  ]

  return (
    <div className="p-6 space-y-6">
      <PageHeader title="Payments" description="All recorded payments in your network" />

      <div className="rounded-lg border bg-white">
        <DataTable
          columns={columns}
          data={(data?.data || []) as unknown as Payment[]}
          isLoading={isLoading}
          pagination={{
            page,
            totalPages: data?.meta?.totalPages || 1,
            onPageChange: setPage,
          }}
          keyExtractor={(r) => r.id}
          emptyMessage="No payments recorded yet"
        />
      </div>
    </div>
  )
}
