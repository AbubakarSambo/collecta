import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { ArrowLeft, Trophy, Star, CheckCircle, Clock } from 'lucide-react'
import { portalApi } from '@/api/portal'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { StatusBadge } from '@/components/ui/Badge'
import { formatCurrency, formatDate } from '@/lib/utils'
import { cn } from '@/lib/utils'

function TierBadge({ tier, label }: { tier: 'TOP' | 'SECOND' | null; label: string | null }) {
  if (!tier || !label) return null
  return (
    <div
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium',
        tier === 'TOP'
          ? 'bg-yellow-100 text-yellow-800'
          : 'bg-blue-50 text-blue-700',
      )}
    >
      {tier === 'TOP' ? <Trophy className="h-3 w-3" /> : <Star className="h-3 w-3" />}
      {label}
    </div>
  )
}

export function PaymentHistoryPage() {
  const { slug } = useParams<{ slug: string }>()
  const [email, setEmail] = useState('')
  const [submitted, setSubmitted] = useState(false)

  const { mutate, data, isPending, isError, reset } = useMutation({
    mutationFn: () => portalApi.getPaymentHistoryByEmail(slug!, email.trim()),
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim()) return
    setSubmitted(true)
    mutate()
  }

  const handleReset = () => {
    setSubmitted(false)
    setEmail('')
    reset()
  }

  if (!submitted || (!data && !isError)) {
    return (
      <div className="max-w-md mx-auto space-y-6">
        <Link
          to={`/pay/${slug}`}
          className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
        >
          <ArrowLeft className="h-4 w-4" /> Back to portal
        </Link>

        <Card>
          <CardHeader>
            <CardTitle>My Payment History</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-500 mb-4">
              Enter your email address to view your complete payment history and outstanding charges.
            </p>
            <form onSubmit={handleSubmit} className="space-y-3">
              <Input
                type="email"
                placeholder="Your email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isPending}
                required
              />
              <Button type="submit" className="w-full" isLoading={isPending}>
                View My History
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (isError) {
    return (
      <div className="max-w-md mx-auto space-y-4">
        <Card>
          <CardContent className="py-8 text-center space-y-3">
            <p className="text-gray-700 font-medium">No account found for that email.</p>
            <p className="text-sm text-gray-500">
              Check the address and try again, or contact the network admin.
            </p>
            <Button variant="outline" onClick={handleReset}>Try again</Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const history = data as any

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <button
        onClick={handleReset}
        className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
      >
        <ArrowLeft className="h-4 w-4" /> Search again
      </button>

      <div className="text-center space-y-2">
        <h2 className="text-xl font-bold text-gray-900">
          {history.member.firstName} {history.member.lastName}
        </h2>
        <p className="text-sm text-gray-500">{history.networkName}</p>
        {history.tierTag && (
          <TierBadge tier={history.tierTag.tier} label={history.tierTag.label} />
        )}
      </div>

      {/* Outstanding charges */}
      {history.outstandingCharges.length > 0 && (
        <Card className="border-orange-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-orange-700">
              <Clock className="h-4 w-4" />
              Outstanding ({history.outstandingCharges.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {history.outstandingCharges.map((c: any) => (
              <div key={c.id} className="flex items-center justify-between rounded-lg border p-3">
                <div>
                  <p className="font-medium text-sm text-gray-900">{c.feeName}</p>
                  <p className="text-xs text-gray-500">Due {formatDate(c.dueDate)}</p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <p className="font-bold text-sm">{formatCurrency(c.remainingAmount)}</p>
                  <StatusBadge status={c.status} />
                  <Link to={`/pay/${slug}/pay/${c.id}`}>
                    <Button size="sm" className="mt-1">Pay Now</Button>
                  </Link>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Confirmed payments */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-green-700">
            <CheckCircle className="h-4 w-4" />
            Confirmed Payments ({history.confirmedPayments.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {history.confirmedPayments.length === 0 ? (
            <p className="text-sm text-gray-500">No confirmed payments yet.</p>
          ) : (
            <div className="space-y-2">
              {history.confirmedPayments.map((p: any) => (
                <div key={p.id} className="flex items-center justify-between rounded-lg border p-3">
                  <div>
                    <p className="font-medium text-sm text-gray-900">{p.feeName}</p>
                    <p className="text-xs text-gray-500">{formatDate(p.paidAt)}</p>
                    {p.reference && (
                      <p className="text-xs text-gray-400 font-mono">Ref: {p.reference}</p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-sm text-green-700">{formatCurrency(p.amount)}</p>
                    <p className="text-xs text-gray-400 capitalize">{p.method.toLowerCase().replace('_', ' ')}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
