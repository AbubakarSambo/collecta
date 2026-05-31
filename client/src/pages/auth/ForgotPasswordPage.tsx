import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import { useState } from 'react'
import { CheckCircle } from 'lucide-react'
import { authApi } from '@/api/auth'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card'

const schema = z.object({
  email: z.string().email('Enter a valid email'),
})

export function ForgotPasswordPage() {
  const [sent, setSent] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: zodResolver(schema) })

  const onSubmit = async (data: { email: string }) => {
    try {
      await authApi.forgotPassword(data.email)
      setSent(true)
    } catch {
      toast.error('Failed to send reset email. Please try again.')
    }
  }

  if (sent) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface px-4">
        <div className="max-w-md text-center">
          <CheckCircle className="mx-auto mb-4 h-14 w-14 text-green-600" />
          <h1 className="text-2xl font-bold text-gray-900">Check your email</h1>
          <p className="mt-2 text-gray-500">
            If an account with that email exists, we sent a password reset link.
          </p>
          <Link to="/login" className="mt-6 inline-block">
            <Button variant="outline">Back to Login</Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface px-4">
      <div className="w-full max-w-md">
        <Card>
          <CardHeader>
            <CardTitle>Reset your password</CardTitle>
            <CardDescription>Enter your email and we'll send you a reset link</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  error={errors.email?.message}
                  {...register('email')}
                />
              </div>

              <Button type="submit" className="w-full" isLoading={isSubmitting}>
                Send Reset Link
              </Button>
            </form>

            <p className="mt-4 text-center text-sm text-gray-500">
              <Link to="/login" className="text-brand-700 hover:underline">
                Back to Login
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
