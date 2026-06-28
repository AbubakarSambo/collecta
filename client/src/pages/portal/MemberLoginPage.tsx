import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { memberAuthApi } from '@/api/memberAuth'
import { saveMemberSession, getMemberSession } from '@/hooks/useMemberSession'
import { useAnalytics } from '@/hooks/useAnalytics'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { ArrowLeft, Mail, KeyRound } from 'lucide-react'

export function MemberLoginPage() {
  const { slug } = useParams<{ slug: string }>()
  const navigate = useNavigate()

  const { track } = useAnalytics()
  const [step, setStep] = useState<'email' | 'otp'>('email')
  const [email, setEmail] = useState('')
  const [otp, setOtp] = useState('')
  const [error, setError] = useState('')

  const requestMutation = useMutation({
    mutationFn: () => memberAuthApi.requestOtp(slug!, email.trim()),
    onSuccess: () => {
      track('member_otp_requested', { networkSlug: slug })
      setError('')
      setStep('otp')
    },
    onError: () => {
      setError('Something went wrong. Please try again.')
    },
  })

  const verifyMutation = useMutation({
    mutationFn: () => memberAuthApi.verifyOtp(slug!, email.trim(), otp.trim()),
    onSuccess: (res) => {
      const member = res?.data?.member ?? res?.member
      if (member) {
        track('member_portal_signed_in', { networkSlug: slug })
        saveMemberSession(member)
        navigate(`/pay/${slug}/profile/${member.id}`)
      } else {
        setError('Could not retrieve your account. Please try again.')
      }
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message
      setError(typeof msg === 'string' ? msg : 'Invalid or expired code.')
    },
  })

  const handleEmailSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!email.trim()) return
    requestMutation.mutate()
  }

  const handleOtpSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (otp.trim().length !== 6) {
      setError('Please enter the 6-digit code.')
      return
    }
    verifyMutation.mutate()
  }

  // If already logged in, redirect straight to profile
  const existing = slug ? getMemberSession(slug) : null
  if (existing) {
    navigate(`/pay/${slug}/profile/${existing.id}`, { replace: true })
    return null
  }

  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <button
          onClick={() => navigate(`/pay/${slug}`)}
          className="mb-6 flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
        >
          <ArrowLeft className="h-4 w-4" /> Back to portal
        </button>

        {step === 'email' ? (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Mail className="h-5 w-5 text-brand-600" />
                <CardTitle>Sign in</CardTitle>
              </div>
              <p className="text-sm text-gray-500">
                Enter your email address and we'll send you a one-time login code.
              </p>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleEmailSubmit} className="space-y-4">
                <Input
                  type="email"
                  placeholder="your@email.com"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setError('') }}
                  disabled={requestMutation.isPending}
                  autoFocus
                />
                {error && <p className="text-sm text-red-600">{error}</p>}
                <Button
                  type="submit"
                  className="w-full"
                  disabled={requestMutation.isPending || !email.trim()}
                >
                  {requestMutation.isPending ? 'Sending code...' : 'Send login code'}
                </Button>
              </form>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <KeyRound className="h-5 w-5 text-brand-600" />
                <CardTitle>Enter your code</CardTitle>
              </div>
              <p className="text-sm text-gray-500">
                We sent a 6-digit code to <strong>{email}</strong>. It expires in 15 minutes.
              </p>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleOtpSubmit} className="space-y-4">
                <Input
                  placeholder="000000"
                  value={otp}
                  onChange={(e) => { setOtp(e.target.value.replace(/\D/g, '').slice(0, 6)); setError('') }}
                  disabled={verifyMutation.isPending}
                  inputMode="numeric"
                  autoFocus
                  className="text-center text-2xl tracking-widest font-mono"
                />
                {error && <p className="text-sm text-red-600">{error}</p>}
                <Button
                  type="submit"
                  className="w-full"
                  disabled={verifyMutation.isPending || otp.length !== 6}
                >
                  {verifyMutation.isPending ? 'Verifying...' : 'Sign in'}
                </Button>
                <button
                  type="button"
                  onClick={() => { setStep('email'); setOtp(''); setError('') }}
                  className="w-full text-sm text-gray-500 hover:text-gray-700"
                >
                  Use a different email
                </button>
              </form>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
