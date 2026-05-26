import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { PlusCircle, Search } from 'lucide-react'
import { paymentsApi } from '@/api/payments'
import { membersApi } from '@/api/members'
import { chargesApi } from '@/api/charges'
import { useNetwork } from '@/hooks/useNetwork'
import { PageHeader } from '@/components/shared/PageHeader'
import { DataTable, Column } from '@/components/shared/DataTable'
import { StatusBadge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { formatCurrency, formatDate } from '@/lib/utils'
import type { Payment } from '@/types'
import { useDebounce } from '@/hooks/useDebounce'

const PAYMENT_METHODS = [
  { value: 'CASH', label: 'Cash' },
  { value: 'BANK_TRANSFER', label: 'Bank Transfer' },
  { value: 'OTHER', label: 'Other' },
]

function RecordPaymentModal({
  networkId,
  open,
  onClose,
}: {
  networkId: string
  open: boolean
  onClose: () => void
}) {
  const queryClient = useQueryClient()
  const [memberSearch, setMemberSearch] = useState('')
  const [selectedMemberId, setSelectedMemberId] = useState('')
  const [selectedChargeId, setSelectedChargeId] = useState('')
  const [amount, setAmount] = useState('')
  const [method, setMethod] = useState('CASH')
  const [note, setNote] = useState('')

  const debouncedSearch = useDebounce(memberSearch, 300)

  const { data: membersData } = useQuery({
    queryKey: ['members', networkId, 'search', debouncedSearch],
    queryFn: () => membersApi.list(networkId, { search: debouncedSearch, limit: 10 }),
    enabled: !!networkId && debouncedSearch.length >= 1,
    select: (r) => r.data?.data ?? [],
  })

  const selectedMember = membersData?.find((m: any) => m.id === selectedMemberId)

  const { data: chargesData } = useQuery({
    queryKey: ['charges', networkId, 'unpaid', selectedMemberId],
    queryFn: () =>
      chargesApi.list(networkId, { memberId: selectedMemberId, status: 'PENDING,OVERDUE,PARTIALLY_PAID', limit: 50 }),
    enabled: !!selectedMemberId,
    select: (r) => r.data?.data ?? [],
  })

  const unpaidCharges = (chargesData ?? []).filter(
    (c: any) => ['PENDING', 'OVERDUE', 'PARTIALLY_PAID'].includes(c.status),
  )

  const selectedCharge = unpaidCharges.find((c: any) => c.id === selectedChargeId)
  const maxAmount = selectedCharge
    ? Number(selectedCharge.amount) - Number(selectedCharge.paidAmount)
    : undefined

  const mutation = useMutation({
    mutationFn: () =>
      paymentsApi.create(networkId, {
        chargeId: selectedChargeId,
        memberId: selectedMemberId,
        amount: parseFloat(amount),
        method,
        note: note || undefined,
      }),
    onSuccess: () => {
      toast.success('Payment recorded')
      queryClient.invalidateQueries({ queryKey: ['payments', networkId] })
      queryClient.invalidateQueries({ queryKey: ['charges', networkId] })
      handleClose()
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || 'Failed to record payment'),
  })

  const handleClose = () => {
    setMemberSearch('')
    setSelectedMemberId('')
    setSelectedChargeId('')
    setAmount('')
    setMethod('CASH')
    setNote('')
    onClose()
  }

  const canSubmit =
    selectedMemberId &&
    selectedChargeId &&
    parseFloat(amount) > 0 &&
    (!maxAmount || parseFloat(amount) <= maxAmount)

  return (
    <Modal isOpen={open} onClose={handleClose} title="Record Cash Payment">
      <div className="space-y-4">
        {/* Step 1: find member */}
        <div>
          <label className="text-sm font-medium text-gray-700 mb-1 block">Member</label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              className="pl-9"
              placeholder="Search by name or email..."
              value={memberSearch}
              onChange={(e) => {
                setMemberSearch(e.target.value)
                setSelectedMemberId('')
                setSelectedChargeId('')
                setAmount('')
              }}
            />
          </div>

          {membersData && membersData.length > 0 && !selectedMemberId && (
            <div className="mt-1 rounded-md border bg-white shadow-sm divide-y max-h-40 overflow-y-auto">
              {membersData.map((m: any) => (
                <button
                  key={m.id}
                  type="button"
                  className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50"
                  onClick={() => {
                    setSelectedMemberId(m.id)
                    setMemberSearch(`${m.firstName} ${m.lastName}`)
                  }}
                >
                  <span className="font-medium">{m.firstName} {m.lastName}</span>
                  {m.unit && <span className="text-gray-400 ml-2">· {m.unit}</span>}
                </button>
              ))}
            </div>
          )}

          {selectedMember && (
            <p className="text-xs text-green-700 mt-1">
              {selectedMember.firstName} {selectedMember.lastName} selected
            </p>
          )}
        </div>

        {/* Step 2: select charge */}
        {selectedMemberId && (
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">Unpaid Charge</label>
            {unpaidCharges.length === 0 ? (
              <p className="text-sm text-gray-500 bg-gray-50 rounded px-3 py-2">
                No unpaid charges found for this member.
              </p>
            ) : (
              <div className="space-y-1">
                {unpaidCharges.map((c: any) => {
                  const remaining = Number(c.amount) - Number(c.paidAmount)
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => {
                        setSelectedChargeId(c.id)
                        setAmount(String(remaining))
                      }}
                      className={`w-full text-left rounded-md border px-3 py-2 text-sm transition-colors ${
                        selectedChargeId === c.id
                          ? 'border-gray-900 bg-gray-50 font-medium'
                          : 'border-gray-200 hover:border-gray-400'
                      }`}
                    >
                      <div className="flex justify-between">
                        <span>{c.fee?.name || c.description || 'Charge'}</span>
                        <span className="font-semibold">{formatCurrency(remaining)}</span>
                      </div>
                      <div className="text-xs text-gray-400 mt-0.5">
                        Due {formatDate(c.dueDate)} · {c.status}
                      </div>
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* Step 3: amount + method */}
        {selectedChargeId && (
          <>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">Amount (NGN)</label>
                <Input
                  type="number"
                  min={1}
                  max={maxAmount}
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
                {maxAmount !== undefined && parseFloat(amount) > maxAmount && (
                  <p className="text-xs text-red-600 mt-1">Max: {formatCurrency(maxAmount)}</p>
                )}
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">Method</label>
                <Select
                  value={method}
                  onChange={(e) => setMethod(e.target.value)}
                  options={PAYMENT_METHODS}
                />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Note (optional)</label>
              <Input
                placeholder="e.g. Paid in office"
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
            </div>
          </>
        )}

        <div className="flex gap-2 pt-2">
          <Button
            className="flex-1"
            onClick={() => mutation.mutate()}
            disabled={!canSubmit || mutation.isPending}
            isLoading={mutation.isPending}
          >
            Record Payment
          </Button>
          <Button variant="outline" onClick={handleClose} disabled={mutation.isPending}>
            Cancel
          </Button>
        </div>
      </div>
    </Modal>
  )
}

export function PaymentsPage() {
  const { networkId } = useNetwork()
  const [page, setPage] = useState(1)
  const [showModal, setShowModal] = useState(false)

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
      <PageHeader
        title="Payments"
        description="All recorded payments in your network"
        action={
          <Button onClick={() => setShowModal(true)} size="sm">
            <PlusCircle className="h-4 w-4" />
            Record Cash Payment
          </Button>
        }
      />

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
          keyExtractor={(r) => (r as any).id}
          emptyMessage="No payments recorded yet"
        />
      </div>

      {networkId && (
        <RecordPaymentModal
          networkId={networkId}
          open={showModal}
          onClose={() => setShowModal(false)}
        />
      )}
    </div>
  )
}
