import { useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useQuery, useMutation } from '@tanstack/react-query'
import { portalApi } from '@/api/portal'
import { getMemberSession } from '@/hooks/useMemberSession'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { formatCurrency } from '@/lib/utils'
import { FullPageSpinner } from '@/components/ui/Spinner'
import { Search, AlertCircle, User, ShieldCheck, Clock } from 'lucide-react'

interface PayerForm {
  firstName: string
  lastName: string
  email: string
  amount: string
}

function OpenFeeCard({ fee, slug }: { fee: any; slug: string }) {
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState<PayerForm>({
    firstName: '',
    lastName: '',
    email: '',
    amount: String(fee.amount),
  })
  const [error, setError] = useState('')

  const mutation = useMutation({
    mutationFn: () =>
      portalApi.payOpenFee(slug, fee.id, {
        firstName: form.firstName,
        lastName: form.lastName,
        email: form.email,
        amount: parseFloat(form.amount),
      }),
    onSuccess: (res) => {
      const url = res?.data?.paymentUrl ?? res?.paymentUrl
      if (url) {
        window.location.href = url
      } else {
        setError('Could not retrieve payment URL. Please try again.')
      }
    },
    onError: () => {
      setError('Something went wrong. Please try again.')
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!form.firstName.trim() || !form.lastName.trim() || !form.email.trim()) {
      setError('Please fill in all fields.')
      return
    }
    const amt = parseFloat(form.amount)
    if (isNaN(amt) || amt <= 0) {
      setError('Please enter a valid amount.')
      return
    }
    if (amt > Number(fee.amount)) {
      setError(`Amount cannot exceed ${formatCurrency(Number(fee.amount))}.`)
      return
    }
    mutation.mutate()
  }

  return (
    <Card key={fee.id}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="font-semibold text-gray-900">{fee.name}</h4>
            {fee.description && (
              <p className="text-xs text-gray-500 mt-1">{fee.description}</p>
            )}
          </div>
          <p className="text-xl font-bold text-green-700">{formatCurrency(Number(fee.amount))}</p>
        </div>

        {fee.options && fee.options.length > 0 && (
          <div className="mt-3 space-y-1">
            {fee.options.map((opt: any, idx: number) => (
              <div key={idx} className="flex items-center justify-between text-sm">
                <span className="text-gray-600">{opt.name}</span>
                <span className="font-medium">{formatCurrency(opt.amount)}</span>
              </div>
            ))}
          </div>
        )}

        {!open ? (
          <Button className="mt-4 w-full" onClick={() => setOpen(true)}>
            Pay Now
          </Button>
        ) : (
          <form onSubmit={handleSubmit} className="mt-4 space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <Input
                placeholder="First name"
                value={form.firstName}
                onChange={(e) => setForm((f) => ({ ...f, firstName: e.target.value }))}
                disabled={mutation.isPending}
              />
              <Input
                placeholder="Last name"
                value={form.lastName}
                onChange={(e) => setForm((f) => ({ ...f, lastName: e.target.value }))}
                disabled={mutation.isPending}
              />
            </div>
            <Input
              type="email"
              placeholder="Email address"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              disabled={mutation.isPending}
            />
            <div className="space-y-1">
              <label className="text-xs text-gray-500">
                Amount (max {formatCurrency(Number(fee.amount))})
              </label>
              <Input
                type="number"
                min={1}
                max={Number(fee.amount)}
                step="0.01"
                value={form.amount}
                onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
                disabled={mutation.isPending}
              />
              {parseFloat(form.amount) < Number(fee.amount) && parseFloat(form.amount) > 0 && (
                <p className="text-xs text-yellow-700">
                  Partial payment — {formatCurrency(Number(fee.amount) - parseFloat(form.amount))} will remain outstanding.
                </p>
              )}
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <div className="flex gap-2">
              <Button type="submit" className="flex-1" disabled={mutation.isPending}>
                {mutation.isPending ? 'Redirecting...' : 'Continue to Payment'}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => { setOpen(false); setError('') }}
                disabled={mutation.isPending}
              >
                Cancel
              </Button>
            </div>
          </form>
        )}
      </CardContent>
    </Card>
  )
}

export function MemberPortalPage() {
  const { slug } = useParams<{ slug: string }>()
  const navigate = useNavigate()
  const [emailInput, setEmailInput] = useState('')
  const [lookupError, setLookupError] = useState('')

  const existingSession = slug ? getMemberSession(slug) : null

  const { data, isLoading } = useQuery({
    queryKey: ['portal', slug],
    queryFn: () => portalApi.getNetwork(slug!),
    enabled: !!slug,
    select: (r) => r.data,
  })

  const lookupMutation = useMutation({
    mutationFn: () => portalApi.getMemberByEmail(slug!, emailInput.trim()),
    onSuccess: (res) => {
      const memberId = res?.data?.member?.id ?? res?.member?.id
      if (memberId) {
        navigate(`/pay/${slug}/profile/${memberId}`)
      } else {
        setLookupError('Could not find your account. Please try again.')
      }
    },
    onError: () => {
      setLookupError('No account found for that email address.')
    },
  })

  const handleLookup = () => {
    if (!emailInput.trim()) return
    setLookupError('')
    lookupMutation.mutate()
  }

  if (isLoading) return <FullPageSpinner />

  if (!data) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Network not found</p>
      </div>
    )
  }

  // Portal not yet live
  if (data.comingSoon) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-yellow-100">
          <Clock className="h-8 w-8 text-yellow-600" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900">{data.network.name}</h2>
        <p className="text-gray-500 max-w-sm">
          {data.reason === 'no_bank_account'
            ? 'This organisation is almost ready — they need to connect a bank account before payments can be accepted. Contact the admin.'
            : 'This network is setting up their payment portal. Check back soon.'}
        </p>
        <p className="text-xs text-gray-400">Powered by Collecta</p>
      </div>
    )
  }

  const { network, openFees } = data

  return (
    <div className="space-y-8">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900">Welcome to {network.name}</h2>
        {network.isVerified && (
          <Link
            to="/about/verification"
            className="inline-flex items-center gap-1 mt-1 text-xs text-green-700 hover:underline"
          >
            <ShieldCheck className="h-3.5 w-3.5" />
            Verified by Collecta
          </Link>
        )}
        {network.description && (
          <p className="mt-2 text-gray-500">{network.description}</p>
        )}
      </div>

      {/* Open Fees */}
      {openFees.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Available Payments</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            {openFees.map((fee: any) => (
              <OpenFeeCard key={fee.id} fee={fee} slug={slug!} />
            ))}
          </div>
        </div>
      )}

      {/* Payment history link */}
      <div className="text-center">
        <Link to={`/pay/${slug}/history`} className="text-sm text-gray-400 hover:underline">
          View my payment history by email
        </Link>
      </div>

      {/* Member access */}
      {existingSession ? (
        <Card className="border-green-200 bg-green-50">
          <CardContent className="p-4 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-green-100">
                <User className="h-5 w-5 text-green-700" />
              </div>
              <div>
                <p className="font-medium text-gray-900">
                  {existingSession.firstName} {existingSession.lastName}
                </p>
                <p className="text-xs text-gray-500">Signed in</p>
              </div>
            </div>
            <Button onClick={() => navigate(`/pay/${slug}/profile/${existingSession.id}`)}>
              View my payments
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>View My Payment History</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-gray-500">
              Sign in with your email to view your charges and payment history.
            </p>
            <Button className="w-full" onClick={() => navigate(`/pay/${slug}/login`)}>
              Sign in
            </Button>
            <p className="text-center text-xs text-gray-400">
              Or look up by email address directly:
            </p>
            <div className="flex gap-2">
              <Input
                type="email"
                placeholder="Your email address..."
                value={emailInput}
                onChange={(e) => { setEmailInput(e.target.value); setLookupError('') }}
                onKeyDown={(e) => { if (e.key === 'Enter') handleLookup() }}
                disabled={lookupMutation.isPending}
              />
              <Button
                variant="outline"
                onClick={handleLookup}
                disabled={lookupMutation.isPending || !emailInput.trim()}
              >
                <Search className="h-4 w-4" />
                {lookupMutation.isPending ? '...' : 'View'}
              </Button>
            </div>
            {lookupError && (
              <div className="flex items-center gap-2 text-sm text-red-600">
                <AlertCircle className="h-4 w-4 shrink-0" />
                {lookupError}
              </div>
            )}
          </CardContent>
        </Card>
      )}
      {/* Footer */}
      <div className="pt-4 border-t flex justify-center gap-4 text-xs text-gray-400">
        <Link to="/terms" className="hover:underline">Terms</Link>
        <Link to="/privacy" className="hover:underline">Privacy</Link>
        <span>Powered by Collecta</span>
      </div>
    </div>
  )
}
