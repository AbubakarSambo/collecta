import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { CheckCircle, XCircle, Trophy, Star, Mail } from 'lucide-react'
import { Spinner } from '@/components/ui/Spinner'
import { cn, formatCurrency } from '@/lib/utils'
import apiClient from '@/api/client'

interface TierTag {
  tier: 'TOP' | 'SECOND' | null
  label: string | null
}

interface PaymentResult {
  status: string
  alreadyRecorded?: boolean
  tierTag?: TierTag | null
  feeName?: string
  amount?: number
  networkName?: string
  memberName?: string
  paidAt?: string
}

function TierBadge({ tierTag }: { tierTag: TierTag | null }) {
  if (!tierTag?.tier || !tierTag.label) return null
  return (
    <div
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-medium mt-4',
        tierTag.tier === 'TOP'
          ? 'bg-yellow-100 text-yellow-800'
          : 'bg-blue-50 text-blue-700',
      )}
    >
      {tierTag.tier === 'TOP' ? <Trophy className="h-4 w-4" /> : <Star className="h-4 w-4" />}
      {tierTag.label}
    </div>
  )
}

export function PaymentCallbackPage() {
  const [searchParams] = useSearchParams()
  const reference = searchParams.get('reference') || searchParams.get('trxref')
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [result, setResult] = useState<PaymentResult | null>(null)

  useEffect(() => {
    if (!reference) {
      setStatus('error')
      return
    }

    apiClient
      .get(`/portal/verify-payment?reference=${reference}`)
      .then((res) => {
        const data = res.data?.data ?? res.data
        if (data?.status === 'success' || data?.alreadyRecorded) {
          setStatus('success')
          setResult(data)
        } else {
          setStatus('error')
        }
      })
      .catch(() => setStatus('error'))
  }, [reference])

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full text-center">
        {status === 'loading' && (
          <>
            <Spinner size="lg" className="mx-auto mb-4" />
            <h1 className="text-xl font-semibold text-gray-900">Verifying payment...</h1>
            <p className="text-gray-500 mt-2">Please wait while we confirm your payment.</p>
          </>
        )}

        {status === 'success' && (
          <>
            <CheckCircle className="mx-auto mb-4 h-16 w-16 text-green-500" />
            <h1 className="text-2xl font-bold text-gray-900">Payment Confirmed</h1>
            {result?.networkName && (
              <p className="mt-1 text-gray-500">{result.networkName}</p>
            )}

            {/* Receipt details */}
            <div className="mt-5 rounded-lg border bg-white p-4 text-left space-y-2 text-sm">
              {result?.memberName && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Member</span>
                  <span className="font-medium">{result.memberName}</span>
                </div>
              )}
              {result?.feeName && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Fee</span>
                  <span className="font-medium">{result.feeName}</span>
                </div>
              )}
              {result?.amount !== undefined && (
                <div className="flex justify-between border-t pt-2">
                  <span className="font-semibold text-gray-700">Amount paid</span>
                  <span className="font-bold text-green-700">{formatCurrency(result.amount)}</span>
                </div>
              )}
              <div className="flex justify-between text-xs text-gray-400 border-t pt-2">
                <span>Reference</span>
                <span className="font-mono">{reference}</span>
              </div>
            </div>

            <div className="mt-4 flex items-center justify-center gap-1.5 text-xs text-gray-500">
              <Mail className="h-3.5 w-3.5" />
              A receipt has been sent to your email address.
            </div>

            <TierBadge tierTag={result?.tierTag ?? null} />
          </>
        )}

        {status === 'error' && (
          <>
            <XCircle className="mx-auto mb-4 h-16 w-16 text-red-500" />
            <h1 className="text-2xl font-bold text-gray-900">Payment Status Unknown</h1>
            <p className="mt-2 text-gray-500">
              We could not confirm your payment. If funds were deducted, please save your reference number and contact the network admin.
            </p>
            {reference && (
              <p className="mt-3 text-sm font-mono bg-gray-100 rounded px-3 py-2 inline-block">
                {reference}
              </p>
            )}
          </>
        )}
      </div>
    </div>
  )
}
