import { useEffect, useState } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { useAnalytics } from '@/hooks/useAnalytics'
import { CheckCircle, XCircle, Trophy, Star, Mail, AlertCircle, CheckCircle2, CalendarPlus } from 'lucide-react'
import { Spinner } from '@/components/ui/Spinner'
import { cn, formatCurrency, formatDate } from '@/lib/utils'
import apiClient from '@/api/client'
import { StreakCalendar } from '@/components/portal/StreakCalendar'
import { PeerBenchmark } from '@/components/portal/PeerBenchmark'
import { CollectorNudge } from '@/components/portal/CollectorNudge'
import type { StreakDot, Benchmark } from '@/components/portal/types'

interface TierTag {
  tier: 'TOP' | 'SECOND' | null
  label: string | null
}

interface OutstandingCharge {
  id: string
  feeName: string
  amount: number
  dueDate: string
  status: string
}

interface PaymentResult {
  status: string
  alreadyRecorded?: boolean
  tierTag?: TierTag | null
  feeName?: string
  amount?: number
  networkName?: string
  networkSlug?: string
  memberName?: string
  memberId?: string
  paidAt?: string
  outstandingCharges?: OutstandingCharge[]
  streakCalendar?: StreakDot[]
  benchmark?: Benchmark | null
}

/** Builds and downloads a calendar (.ics) reminder for an upcoming charge. */
function addToCalendar(charge: OutstandingCharge, networkName?: string) {
  const due = new Date(charge.dueDate)
  const stamp = (d: Date) => d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'
  const end = new Date(due.getTime() + 30 * 60 * 1000)
  const ics = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Collecta//Payment Reminder//EN',
    'BEGIN:VEVENT',
    `DTSTART:${stamp(due)}`,
    `DTEND:${stamp(end)}`,
    `SUMMARY:Pay ${charge.feeName}${networkName ? ` — ${networkName}` : ''}`,
    `DESCRIPTION:Reminder to pay ${charge.feeName} via Collecta.`,
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n')
  const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'collecta-reminder.ics'
  a.click()
  URL.revokeObjectURL(url)
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
  const { track } = useAnalytics()

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
          track('payment_confirmed', {
            reference,
            amount: data.amount,
            feeName: data.feeName,
            networkSlug: data.networkSlug,
            alreadyRecorded: !!data.alreadyRecorded,
            outstandingCount: data.outstandingCharges?.length ?? 0,
          })
        } else {
          setStatus('error')
          track('payment_verification_failed', { reference, reason: 'status_not_success' })
        }
      })
      .catch(() => {
        setStatus('error')
        track('payment_verification_failed', { reference, reason: 'network_error' })
      })
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

            {/* Directional step — outstanding charges */}
            {result?.outstandingCharges !== undefined && (
              <div className="mt-4">
                {result.outstandingCharges.length === 0 ? (
                  <div className="flex items-center justify-center gap-2 rounded-lg bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-800">
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-green-600" />
                    <span className="font-medium">Account clear — no outstanding charges.</span>
                  </div>
                ) : (
                  <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-amber-600" />
                      <div className="flex-1">
                        <p className="font-medium mb-1">You still have outstanding charges:</p>
                        <div className="space-y-1">
                          {result.outstandingCharges.map((c) => (
                            <div key={c.id} className="flex items-center justify-between">
                              <span>{c.feeName} — due {formatDate(c.dueDate)}</span>
                              <span className="font-semibold ml-2">{formatCurrency(c.amount)}</span>
                            </div>
                          ))}
                        </div>
                        {result.networkSlug && (
                          <Link
                            to={`/pay/${result.networkSlug}/pay/${result.outstandingCharges[0].id}`}
                            className="mt-2 inline-block font-medium underline text-amber-800 hover:text-amber-900"
                          >
                            Pay next charge →
                          </Link>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            <TierBadge tierTag={result?.tierTag ?? null} />

            {/* Engagement layer */}
            <div className="mt-6 space-y-4 text-left">
              {result?.streakCalendar && result.streakCalendar.length > 0 && (
                <StreakCalendar dots={result.streakCalendar} />
              )}

              <PeerBenchmark benchmark={result?.benchmark} />

              {result?.outstandingCharges && result.outstandingCharges.length > 0 && (
                <button
                  onClick={() => { track('calendar_reminder_downloaded', { networkSlug: result.networkSlug }); addToCalendar(result.outstandingCharges![0], result.networkName) }}
                  className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-gray-300 px-4 py-3 text-sm font-medium text-gray-600 hover:border-gray-400 hover:text-gray-900"
                >
                  <CalendarPlus className="h-4 w-4" />
                  Add a reminder for your next payment
                </button>
              )}

              {result?.networkSlug && <CollectorNudge slug={result.networkSlug} />}
            </div>
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
