import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { chargesApi } from '@/api/charges'
import { paymentsApi } from '@/api/payments'
import { useNetwork } from '@/hooks/useNetwork'
import { PageHeader } from '@/components/shared/PageHeader'
import { DataTable, Column } from '@/components/shared/DataTable'
import { Button } from '@/components/ui/Button'
import { Select } from '@/components/ui/Select'
import { Modal } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { StatusBadge } from '@/components/ui/Badge'
import { formatCurrency, formatDate } from '@/lib/utils'
import { CHARGE_STATUSES, PAYMENT_METHODS } from '@/lib/constants'
import type { Charge } from '@/types'

export function ChargesPage() {
  const { networkId } = useNetwork()
  const queryClient = useQueryClient()
  const [page, setPage] = useState(1)
  const [statusFilter, setStatusFilter] = useState('')
  const [payOpen, setPayOpen] = useState<Charge | null>(null)
  const [payAmount, setPayAmount] = useState('')
  const [payMethod, setPayMethod] = useState('CASH')

  const { data, isLoading } = useQuery({
    queryKey: ['charges', networkId, page, statusFilter],
    queryFn: () => chargesApi.list(networkId!, { page, status: statusFilter || undefined }),
    enabled: !!networkId,
    select: (r) => r.data,
  })

  const waiveMutation = useMutation({
    mutationFn: (id: string) => chargesApi.waive(networkId!, id),
    onSuccess: () => {
      toast.success('Charge waived')
      queryClient.invalidateQueries({ queryKey: ['charges', networkId] })
    },
  })

  const recordPaymentMutation = useMutation({
    mutationFn: (charge: Charge) =>
      paymentsApi.create(networkId!, {
        chargeId: charge.id,
        memberId: charge.memberId,
        amount: Number(payAmount),
        method: payMethod,
      }),
    onSuccess: () => {
      toast.success('Payment recorded')
      queryClient.invalidateQueries({ queryKey: ['charges', networkId] })
      queryClient.invalidateQueries({ queryKey: ['payments', networkId] })
      setPayOpen(null)
      setPayAmount('')
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || 'Failed'),
  })

  const columns: Column<Charge>[] = [
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
      render: (row) => <span className="text-sm">{(row as any).fee?.name || row.description || '—'}</span>,
    },
    {
      key: 'amount',
      header: 'Amount',
      render: (row) => <span className="font-semibold">{formatCurrency(Number(row.amount))}</span>,
    },
    {
      key: 'dueDate',
      header: 'Due Date',
      render: (row) => <span className="text-sm text-gray-600">{formatDate(row.dueDate)}</span>,
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => <StatusBadge status={row.status} />,
    },
    {
      key: 'actions',
      header: '',
      render: (row) => (
        <div className="flex gap-1">
          {(row.status === 'PENDING' || row.status === 'OVERDUE' || row.status === 'PARTIALLY_PAID') && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setPayOpen(row)
                  setPayAmount(String(Number(row.amount) - Number(row.paidAmount)))
                }}
              >
                Pay
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="text-gray-500"
                onClick={() => waiveMutation.mutate(row.id)}
              >
                Waive
              </Button>
            </>
          )}
        </div>
      ),
    },
  ]

  return (
    <div className="p-6 space-y-6">
      <PageHeader title="Charges" description="Track all payment obligations" />

      <div className="flex items-center gap-3">
        <Select
          options={[{ value: '', label: 'All Statuses' }, ...CHARGE_STATUSES]}
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1) }}
          className="w-48"
        />
      </div>

      <div className="rounded-lg border bg-white">
        <DataTable
          columns={columns}
          data={(data?.data || []) as unknown as Charge[]}
          isLoading={isLoading}
          pagination={{
            page,
            totalPages: data?.meta?.totalPages || 1,
            onPageChange: setPage,
          }}
          keyExtractor={(r) => r.id}
          emptyMessage="No charges found"
        />
      </div>

      <Modal isOpen={!!payOpen} onClose={() => setPayOpen(null)} title="Record Payment">
        {payOpen && (
          <div className="space-y-3">
            <div className="rounded-lg bg-gray-50 p-3">
              <p className="text-sm text-gray-500">Charge</p>
              <p className="font-medium">{(payOpen as any).fee?.name || payOpen.description}</p>
              <p className="text-sm text-gray-600">Total: {formatCurrency(Number(payOpen.amount))}</p>
              <p className="text-sm text-gray-600">Paid: {formatCurrency(Number(payOpen.paidAmount))}</p>
            </div>
            <div>
              <Label>Amount</Label>
              <Input
                type="number"
                value={payAmount}
                onChange={(e) => setPayAmount(e.target.value)}
              />
            </div>
            <div>
              <Label>Method</Label>
              <Select
                options={PAYMENT_METHODS}
                value={payMethod}
                onChange={(e) => setPayMethod(e.target.value)}
              />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setPayOpen(null)}>Cancel</Button>
              <Button
                className="flex-1"
                isLoading={recordPaymentMutation.isPending}
                onClick={() => recordPaymentMutation.mutate(payOpen)}
              >
                Record Payment
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
