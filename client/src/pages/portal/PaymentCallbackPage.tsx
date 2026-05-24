import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { CheckCircle, XCircle } from 'lucide-react'
import { Spinner } from '@/components/ui/Spinner'
import apiClient from '@/api/client'

export function PaymentCallbackPage() {
  const [searchParams] = useSearchParams()
  const reference = searchParams.get('reference') || searchParams.get('trxref')
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')

  useEffect(() => {
    if (!reference) {
      setStatus('error')
      return
    }

    apiClient
      .get(`/portal/verify-payment?reference=${reference}`)
      .then((res) => {
        const data = res.data?.data ?? res.data
        setStatus(data?.status === 'success' || data?.alreadyRecorded ? 'success' : 'error')
      })
      .catch(() => setStatus('error'))
  }, [reference])

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md text-center">
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
            <h1 className="text-2xl font-bold text-gray-900">Payment Successful!</h1>
            <p className="mt-2 text-gray-500">
              Your payment has been received and recorded. Thank you!
            </p>
            <p className="mt-2 text-xs text-gray-400">Reference: {reference}</p>
          </>
        )}

        {status === 'error' && (
          <>
            <XCircle className="mx-auto mb-4 h-16 w-16 text-red-500" />
            <h1 className="text-2xl font-bold text-gray-900">Payment Status Unknown</h1>
            <p className="mt-2 text-gray-500">
              We could not confirm your payment. Please contact the network admin if funds were deducted.
            </p>
          </>
        )}
      </div>
    </div>
  )
}
