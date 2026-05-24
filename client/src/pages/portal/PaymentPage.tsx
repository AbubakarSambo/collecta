import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'
import { ExternalLink, ArrowLeft } from 'lucide-react'
import { portalApi } from '@/api/portal'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { formatCurrency } from '@/lib/utils'
import { FullPageSpinner } from '@/components/ui/Spinner'

export function PaymentPage() {
  const { slug, chargeId } = useParams<{ slug: string; chargeId: string }>()
  const navigate = useNavigate()

  const { data, isLoading } = useQuery({
    queryKey: ['portal', slug, 'charge', chargeId],
    queryFn: () => portalApi.getCharge(slug!, chargeId!),
    enabled: !!slug && !!chargeId,
    select: (r) => r.data ?? r,
  })

  const [amountInput, setAmountInput] = useState('')
  const [amountError, setAmountError] = useState('')

  useEffect(() => {
    if (data?.remainingAmount !== undefined) {
      setAmountInput(String(data.remainingAmount))
    }
  }, [data?.remainingAmount])

  const initiatePayment = useMutation({
    mutationFn: () => {
      const amount = parseFloat(amountInput)
      return portalApi.initiatePayment(slug!, chargeId!, amount)
    },
    onSuccess: (res) => {
      const url = res?.data?.paymentUrl ?? res?.paymentUrl
      if (url) window.location.href = url
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message
      toast.error(typeof msg === 'string' ? msg : 'Payment initiation failed')
    },
  })

  const handlePay = () => {
    const amount = parseFloat(amountInput)
    if (isNaN(amount) || amount <= 0) {
      setAmountError('Please enter a valid amount')
      return
    }
    if (data && amount > data.remainingAmount) {
      setAmountError(`Maximum is ${formatCurrency(data.remainingAmount)}`)
      return
    }
    setAmountError('')
    initiatePayment.mutate()
  }

  if (isLoading) return <FullPageSpinner />

  if (!data) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Charge not found</p>
      </div>
    )
  }

  const isPartial = parseFloat(amountInput) < data.remainingAmount && parseFloat(amountInput) > 0

  return (
    <div className="max-w-md mx-auto space-y-4">
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
      >
        <ArrowLeft className="h-4 w-4" /> Back
      </button>

      <Card>
        <CardHeader>
          <CardTitle>{data.feeName}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Charge summary */}
          <div className="rounded-lg bg-gray-50 p-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Total charged</span>
              <span className="font-medium">{formatCurrency(data.amount)}</span>
            </div>
            {data.paidAmount > 0 && (
              <div className="flex justify-between">
                <span className="text-gray-500">Already paid</span>
                <span className="font-medium text-green-600">{formatCurrency(data.paidAmount)}</span>
              </div>
            )}
            <div className="flex justify-between border-t pt-2">
              <span className="font-semibold text-gray-700">Remaining balance</span>
              <span className="font-bold text-gray-900">{formatCurrency(data.remainingAmount)}</span>
            </div>
          </div>

          {/* Amount input */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">
              Amount to pay (NGN)
            </label>
            <Input
              type="number"
              min={1}
              max={data.remainingAmount}
              step="0.01"
              value={amountInput}
              onChange={(e) => { setAmountInput(e.target.value); setAmountError('') }}
              disabled={initiatePayment.isPending}
            />
            {amountError && <p className="text-sm text-red-600">{amountError}</p>}
            {isPartial && (
              <p className="text-xs text-yellow-700 bg-yellow-50 border border-yellow-200 rounded px-3 py-2">
                This is a partial payment. The remaining{' '}
                <strong>
                  {formatCurrency(data.remainingAmount - parseFloat(amountInput))}
                </strong>{' '}
                will still be outstanding after payment.
              </p>
            )}
          </div>

          <Button
            className="w-full"
            size="lg"
            onClick={handlePay}
            disabled={initiatePayment.isPending || !amountInput}
          >
            <ExternalLink className="h-5 w-5" />
            {initiatePayment.isPending
              ? 'Redirecting...'
              : isPartial
                ? `Pay ${formatCurrency(parseFloat(amountInput) || 0)} now`
                : `Pay ${formatCurrency(data.remainingAmount)} in full`}
          </Button>

          <p className="text-center text-xs text-gray-400">
            You'll be redirected to Paystack's secure payment page.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
