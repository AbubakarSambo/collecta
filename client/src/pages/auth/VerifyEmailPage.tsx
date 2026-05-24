import { useEffect, useState } from 'react'
import { useSearchParams, useNavigate, Link } from 'react-router-dom'
import { CheckCircle, XCircle, Mail } from 'lucide-react'
import { authApi } from '@/api/auth'
import { useAuthStore } from '@/stores/auth.store'
import { Button } from '@/components/ui/Button'
import { Spinner } from '@/components/ui/Spinner'

export function VerifyEmailPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { setAuth } = useAuthStore()
  const token = searchParams.get('token')

  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    if (!token) {
      setStatus('idle')
      return
    }

    setStatus('loading')
    authApi.verifyEmail(token)
      .then((res) => {
        setAuth(res.data.user, res.data.accessToken)
        setStatus('success')
        setTimeout(() => navigate('/dashboard'), 2000)
      })
      .catch((err) => {
        setErrorMessage(err?.response?.data?.message || 'Verification failed')
        setStatus('error')
      })
  }, [token])

  if (!token) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
        <div className="max-w-md text-center">
          <Mail className="mx-auto mb-4 h-14 w-14 text-green-600" />
          <h1 className="text-2xl font-bold text-gray-900">Check your email</h1>
          <p className="mt-2 text-gray-500">
            We sent a verification link to your email address. Click the link to verify your account.
          </p>
          <Button className="mt-6" onClick={() => navigate('/login')}>
            Back to Login
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md text-center">
        {status === 'loading' && (
          <>
            <Spinner size="lg" className="mx-auto mb-4" />
            <h1 className="text-xl font-semibold text-gray-900">Verifying your email...</h1>
          </>
        )}

        {status === 'success' && (
          <>
            <CheckCircle className="mx-auto mb-4 h-14 w-14 text-green-600" />
            <h1 className="text-2xl font-bold text-gray-900">Email verified!</h1>
            <p className="mt-2 text-gray-500">Redirecting you to your dashboard...</p>
          </>
        )}

        {status === 'error' && (
          <>
            <XCircle className="mx-auto mb-4 h-14 w-14 text-red-500" />
            <h1 className="text-2xl font-bold text-gray-900">Verification failed</h1>
            <p className="mt-2 text-gray-500">{errorMessage}</p>
            <Link to="/login">
              <Button className="mt-6">Back to Login</Button>
            </Link>
          </>
        )}
      </div>
    </div>
  )
}
