import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'
import { ExternalLink, ArrowLeft, ShieldCheck, CreditCard, Building2, Hash, Smartphone } from 'lucide-react'
import { portalApi } from '@/api/portal'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { formatCurrency, formatDate } from '@/lib/utils'
import { FullPageSpinner } from '@/components/ui/Spinner'
import { StreakBanner } from '@/components/portal/StreakBanner'
import { OfflinePayOption } from '@/components/portal/OfflinePayOption'

const LARGE_PAYMENT_THRESHOLD = 50000

function calcServiceCharge(amountNaira: number): number {
  return Math.round(Math.min(200 + amountNaira * 0.02, 3000) * 100) / 100
}

type PaymentMethod = 'card' | 'bank_transfer' | 'ussd' | 'mobile_money'

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
  const [confirmed, setConfirmed] = useState(false)
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('card')

  useEffect(() => {
    if (data?.remainingAmount !== undefined) {
      setAmountInput(String(data.remainingAmount))
    }
  }, [data?.remainingAmount])

  const initiatePayment = useMutation({
    mutationFn: () => {
      const amount = parseFloat(amountInput)
      return portalApi.initiatePayment(slug!, chargeId!, amount, paymentMethod)
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

    if (amount >= LARGE_PAYMENT_THRESHOLD && !confirmed) {
      setConfirmed(true)
      return
    }

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

  const payAmount = parseFloat(amountInput) || 0
  const serviceCharge = payAmount > 0 ? calcServiceCharge(payAmount) : 0
  const totalToPay = payAmount + serviceCharge
  const isPartial = payAmount < data.remainingAmount && payAmount > 0
  const isLargePayment = payAmount >= LARGE_PAYMENT_THRESHOLD

  const dueDate = data.dueDate ? new Date(data.dueDate) : null
  const daysUntilDue = dueDate ? Math.ceil((dueDate.getTime() - Date.now()) / 86_400_000) : null
  const isOverdue = data.status === 'OVERDUE'
  const isDueSoon = isOverdue || (daysUntilDue !== null && daysUntilDue >= 0 && daysUntilDue <= 7)

  // Pre-payment confirmation screen for large amounts
  if (confirmed && isLargePayment) {
    return (
      <div className="max-w-md mx-auto space-y-4">
        <button
          onClick={() => setConfirmed(false)}
          className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
        >
          <ArrowLeft className="h-4 w-4" /> Edit amount
        </button>

        <Card className="border-2">
          <CardHeader>
            <CardTitle className="text-center">Confirm Your Payment</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="rounded-lg bg-gray-50 p-4 space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Organisation</span>
                <span className="font-semibold flex items-center gap-1">
                  {data.network?.name}
                  {data.network?.isVerified && (
                    <ShieldCheck className="h-3.5 w-3.5 text-green-600" />
                  )}
                </span>
              </div>
              {data.memberName && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Member</span>
                  <span className="font-medium">{data.memberName}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-gray-500">Fee</span>
                <span className="font-medium">{data.feeName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Fee amount</span>
                <span className="font-medium">{formatCurrency(payAmount)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Service charge</span>
                <span className="font-medium">{formatCurrency(serviceCharge)}</span>
              </div>
              <div className="flex justify-between border-t pt-2">
                <span className="font-semibold">Total you pay</span>
                <span className="font-bold text-lg">{formatCurrency(totalToPay)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Payment via</span>
                <span className="font-medium">Paystack (secure)</span>
              </div>
              {data.network?.bankAccountName && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Paid to</span>
                  <span className="font-medium text-right">
                    {data.network.bankAccountName}
                    {data.network.settlementBank && (
                      <span className="block text-xs text-gray-400">{data.network.settlementBank}</span>
                    )}
                  </span>
                </div>
              )}
            </div>

            {data.network?.isVerified && (
              <p className="text-center text-xs text-green-700 flex items-center justify-center gap-1">
                <ShieldCheck className="h-3.5 w-3.5" />
                This organisation is verified by Collecta
              </p>
            )}

            <Button
              className="w-full"
              size="lg"
              onClick={() => initiatePayment.mutate()}
              isLoading={initiatePayment.isPending}
            >
              <ExternalLink className="h-5 w-5" />
              Confirm — Pay {formatCurrency(totalToPay)}
            </Button>
            <p className="text-center text-xs text-gray-400">
              A receipt will be sent to your email address immediately after payment.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="max-w-md mx-auto space-y-4">
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
      >
        <ArrowLeft className="h-4 w-4" /> Back
      </button>

      {data.consecutiveMonthsPaid > 0 && (
        <StreakBanner
          months={data.consecutiveMonthsPaid}
          subtitle="Pay today — don't break your streak."
        />
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {data.feeName}
            {isDueSoon && (
              <span className="rounded-full bg-red-600 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
                {isOverdue ? 'Overdue' : 'Due soon'}
              </span>
            )}
          </CardTitle>
          {dueDate && (
            <p className="text-xs text-gray-500">Due {formatDate(dueDate)}</p>
          )}
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
              onChange={(e) => { setAmountInput(e.target.value); setAmountError(''); setConfirmed(false) }}
              disabled={initiatePayment.isPending}
            />
            {amountError && <p className="text-sm text-red-600">{amountError}</p>}
            {isPartial && (
              <p className="text-xs text-yellow-700 bg-yellow-50 border border-yellow-200 rounded px-3 py-2">
                This is a partial payment. The remaining{' '}
                <strong>{formatCurrency(data.remainingAmount - payAmount)}</strong>{' '}
                will still be outstanding after payment.
              </p>
            )}
          </div>

          {/* Service charge breakdown */}
          {payAmount > 0 && (
            <div className="rounded-lg border border-gray-200 p-3 space-y-1.5 text-sm">
              <div className="flex justify-between text-gray-600">
                <span>Fee amount</span>
                <span>{formatCurrency(payAmount)}</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>Service charge</span>
                <span>{formatCurrency(serviceCharge)}</span>
              </div>
              <div className="flex justify-between font-semibold border-t pt-1.5 text-gray-900">
                <span>Total you pay</span>
                <span>{formatCurrency(totalToPay)}</span>
              </div>
            </div>
          )}

          {/* Payment method selector */}
          <div className="space-y-2">
            <p className="text-sm font-medium text-gray-700">How would you like to pay?</p>
            <div className="grid grid-cols-2 gap-2">
              {([
                { id: 'card', label: 'Debit / Credit Card', Icon: CreditCard },
                { id: 'bank_transfer', label: 'Bank Transfer', Icon: Building2 },
                { id: 'ussd', label: 'USSD', Icon: Hash },
                ...(data.network?.country === 'KE' && data.network?.kenyaEnabled
                  ? [{ id: 'mobile_money', label: 'Mobile Money', Icon: Smartphone }]
                  : []),
              ] as { id: PaymentMethod; label: string; Icon: React.ElementType }[]).map(({ id, label, Icon }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setPaymentMethod(id)}
                  className={`flex flex-col items-center gap-1.5 rounded-lg border p-3 text-sm transition-colors ${
                    paymentMethod === id
                      ? 'border-gray-900 bg-gray-50 font-semibold'
                      : 'border-gray-200 text-gray-600 hover:border-gray-400'
                  }`}
                >
                  <Icon className="h-5 w-5" />
                  {label}
                </button>
              ))}
            </div>
            {paymentMethod === 'bank_transfer' && (
              <p className="text-xs text-gray-500 bg-blue-50 border border-blue-100 rounded px-3 py-2">
                You'll receive a unique account number to transfer to. Confirmation takes 2–5 minutes.
              </p>
            )}
            {paymentMethod === 'ussd' && (
              <p className="text-xs text-gray-500 bg-blue-50 border border-blue-100 rounded px-3 py-2">
                You'll be given a USSD code to dial. No internet required after you click Pay.
              </p>
            )}
            {paymentMethod === 'mobile_money' && (
              <p className="text-xs text-gray-500 bg-blue-50 border border-blue-100 rounded px-3 py-2">
                Pay via M-Pesa or your mobile money wallet. You'll receive a push notification to confirm.
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
              : isLargePayment
                ? `Review payment — ${formatCurrency(totalToPay)}`
                : isPartial
                  ? `Pay ${formatCurrency(totalToPay)} now`
                  : `Pay ${formatCurrency(totalToPay)} in full`}
          </Button>

          <p className="text-center text-xs text-gray-400">
            Secured by Paystack. A receipt will be sent to your email after payment.
          </p>

          <OfflinePayOption phone={data.network?.contactPhone} />
        </CardContent>
      </Card>
    </div>
  )
}
