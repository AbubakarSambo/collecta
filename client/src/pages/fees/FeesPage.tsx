import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { Plus, PlusCircle, Trash2 } from 'lucide-react'
import { feesApi } from '@/api/fees'
import { useNetwork } from '@/hooks/useNetwork'
import { PageHeader } from '@/components/shared/PageHeader'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { Select } from '@/components/ui/Select'
import { Textarea } from '@/components/ui/Textarea'
import { Badge } from '@/components/ui/Badge'
import { Card, CardContent } from '@/components/ui/Card'
import { FullPageSpinner } from '@/components/ui/Spinner'
import { formatCurrency } from '@/lib/utils'
import { FEE_TYPES, FEE_FREQUENCIES, FEE_PAYMENT_TYPES } from '@/lib/constants'
import { useForm } from 'react-hook-form'
import type { Fee } from '@/types'

export function FeesPage() {
  const navigate = useNavigate()
  const { networkId } = useNetwork()
  const queryClient = useQueryClient()
  const [createOpen, setCreateOpen] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ['fees', networkId],
    queryFn: () => feesApi.list(networkId!),
    enabled: !!networkId,
    select: (r) => r.data,
  })

  interface CreateFeeForm {
    name: string
    type: string
    paymentType: string
    amount: number
    frequency: string
    dueDay: number
    startDate?: string
    description?: string
    penaltyEnabled?: boolean
    penaltyPercent?: number
    penaltyGraceDays?: number
  }

  const { register, handleSubmit, reset, watch, formState: { errors: feeErrors } } = useForm<CreateFeeForm>({
    defaultValues: { type: 'ASSIGNED', paymentType: 'SCHEDULED', frequency: 'MONTHLY', dueDay: 1, penaltyEnabled: false, penaltyGraceDays: 7 },
  })

  const [feeOptions, setFeeOptions] = useState<Array<{ name: string; amount: number }>>([])

  const addOption = () => setFeeOptions((o) => [...o, { name: '', amount: 2000 }])
  const removeOption = (i: number) => setFeeOptions((o) => o.filter((_, idx) => idx !== i))
  const updateOption = (i: number, field: 'name' | 'amount', value: string | number) =>
    setFeeOptions((o) => o.map((opt, idx) => idx === i ? { ...opt, [field]: value } : opt))

  const createMutation = useMutation({
    mutationFn: (data: any) => feesApi.create(networkId!, {
      ...data,
      startDate: data.startDate || undefined,
      options: feeOptions.length > 0 ? feeOptions : undefined,
    }),
    onSuccess: () => {
      toast.success('Fee created')
      queryClient.invalidateQueries({ queryKey: ['fees', networkId] })
      setCreateOpen(false)
      reset()
      setFeeOptions([])
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || 'Failed'),
  })

  const toggleMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      feesApi.update(networkId!, id, { isActive }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['fees', networkId] }),
  })

  if (isLoading) return <FullPageSpinner />

  const fees: Fee[] = data?.data || []

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title="Fees"
        description="Manage assigned and open fees for your network"
        action={
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4" />
            Create Fee
          </Button>
        }
      />

      {fees.length === 0 ? (
        <div className="rounded-lg border bg-white p-12 text-center">
          <p className="text-gray-500">No fees yet. Create your first fee to start collecting.</p>
          <Button className="mt-4" onClick={() => setCreateOpen(true)}>Create Fee</Button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {fees.map((fee) => (
            <Card key={fee.id} className={!fee.isActive ? 'opacity-60' : ''}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-gray-900">{fee.name}</h3>
                      <Badge variant={fee.type === 'ASSIGNED' ? 'info' : 'warning'}>
                        {fee.type}
                      </Badge>
                    </div>
                    <p className="mt-1 text-2xl font-bold text-gray-900">
                      {formatCurrency(Number(fee.amount))}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {fee.frequency === 'ONE_TIME'
                        ? `One-time${fee.startDate ? ` — ${new Date(fee.startDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}` : ''}`
                        : `${fee.frequency} — Due day ${fee.dueDay}${fee.startDate ? ` · From ${new Date(fee.startDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}` : ''}`}
                    </p>
                    {fee.description && (
                      <p className="text-xs text-gray-500 mt-1">{fee.description}</p>
                    )}
                    <p className="mt-2 text-xs text-gray-400">
                      {fee._count?.assignments || 0} members assigned
                    </p>
                  </div>
                </div>

                <div className="mt-4 flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => navigate(`/fees/${fee.id}`)}
                  >
                    View
                  </Button>
                  <Button
                    variant={fee.isActive ? 'outline' : 'default'}
                    size="sm"
                    onClick={() => toggleMutation.mutate({ id: fee.id, isActive: !fee.isActive })}
                  >
                    {fee.isActive ? 'Disable' : 'Enable'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Modal isOpen={createOpen} onClose={() => setCreateOpen(false)} title="Create Fee" size="lg">
        <form onSubmit={handleSubmit((d) => createMutation.mutate(d))} className="space-y-3">
          <div>
            <Label>Fee Name</Label>
            <Input placeholder="Monthly Estate Dues" {...register('name', { required: true })} />
          </div>
          <div>
            <Label>Payment Type</Label>
            <Select
              options={FEE_PAYMENT_TYPES}
              {...register('paymentType')}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Type</Label>
              <Select
                options={FEE_TYPES}
                {...register('type')}
              />
            </div>
            <div>
              <Label>Amount (NGN)</Label>
              <Input
                type="number"
                placeholder="5000"
                error={feeErrors.amount?.message}
                {...register('amount', {
                  valueAsNumber: true,
                  validate: (v) =>
                    v >= 2000 || 'Minimum fee amount is ₦2,000. Lower amounts create poor payment experience for members.',
                })}
              />
              {!feeErrors.amount && watch('amount') >= 2000 && (() => {
                const amt = Number(watch('amount'))
                const svc = Math.round(Math.min(200 + amt * 0.02, 3000) * 100) / 100
                const total = amt + svc
                return (
                  <p className="mt-1 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-1.5">
                    Members will pay <strong>₦{total.toLocaleString()}</strong> — this includes a ₦{svc.toLocaleString()} service charge.
                  </p>
                )
              })()}
            </div>
          </div>
          {watch('type') === 'ASSIGNED' && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Frequency</Label>
                  <Select options={FEE_FREQUENCIES} {...register('frequency')} />
                </div>
                {watch('frequency') !== 'ONE_TIME' && (
                  <div>
                    <Label>Due Day (of month)</Label>
                    <Input type="number" min="1" max="28" placeholder="1" {...register('dueDay', { valueAsNumber: true })} />
                  </div>
                )}
              </div>
              <div>
                <Label>{watch('frequency') === 'ONE_TIME' ? 'Charge Date' : 'Start Date (optional)'}</Label>
                <Input
                  type="date"
                  {...register('startDate')}
                />
                <p className="mt-1 text-xs text-gray-500">
                  {watch('frequency') === 'ONE_TIME'
                    ? 'The specific date this one-off charge is due.'
                    : 'When charges begin for this fee. Defaults to today if left blank.'}
                </p>
              </div>
            </>
          )}
          <div>
            <Label>Description (optional)</Label>
            <Textarea placeholder="Description..." {...register('description')} />
          </div>

          {/* Penalty configuration — ASSIGNED fees only */}
          {watch('type') === 'ASSIGNED' && (
            <div className="rounded-lg border border-gray-200 p-3 space-y-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" className="rounded" {...register('penaltyEnabled')} />
                <span className="text-sm font-medium text-gray-700">Enable late payment penalty</span>
              </label>
              {watch('penaltyEnabled') && (
                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div>
                    <Label>Penalty (%)</Label>
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      placeholder="10"
                      {...register('penaltyPercent', { valueAsNumber: true })}
                    />
                  </div>
                  <div>
                    <Label>Grace period (days)</Label>
                    <Input
                      type="number"
                      min="0"
                      placeholder="7"
                      {...register('penaltyGraceDays', { valueAsNumber: true })}
                    />
                  </div>
                </div>
              )}
              {watch('penaltyEnabled') && (
                <p className="text-xs text-gray-500">
                  A {watch('penaltyPercent') || 0}% penalty applies after {watch('penaltyGraceDays') ?? 7} days overdue.
                  Reminders will warn members before it triggers.
                </p>
              )}
            </div>
          )}

          {/* Options — OPEN fees only */}
          {watch('type') === 'OPEN' && (
            <div className="rounded-lg border border-gray-200 p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">Payment options (optional)</span>
                <button type="button" onClick={addOption} className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-medium">
                  <PlusCircle className="h-3.5 w-3.5" /> Add option
                </button>
              </div>
              {feeOptions.length === 0 && (
                <p className="text-xs text-gray-400">e.g. Guest Parking (₦2,000), Pool Access (₦1,500)</p>
              )}
              {feeOptions.map((opt, i) => (
                <div key={i} className="flex items-center gap-2">
                  <Input
                    placeholder="Option name"
                    value={opt.name}
                    onChange={(e) => updateOption(i, 'name', e.target.value)}
                    className="flex-1"
                  />
                  <Input
                    type="number"
                    placeholder="Amount"
                    value={opt.amount}
                    onChange={(e) => updateOption(i, 'amount', Number(e.target.value))}
                    className="w-28"
                  />
                  <button type="button" onClick={() => removeOption(i)} className="text-gray-400 hover:text-red-500">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="flex gap-2 pt-2">
            <Button type="button" variant="outline" className="flex-1" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" className="flex-1" isLoading={createMutation.isPending}>
              Create Fee
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
