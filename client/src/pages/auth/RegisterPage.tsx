import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Link, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { CheckCircle } from 'lucide-react'
import { authApi } from '@/api/auth'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { Select } from '@/components/ui/Select'
import { Textarea } from '@/components/ui/Textarea'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card'
import { generateSlug } from '@/lib/utils'
import { NETWORK_TYPES } from '@/lib/constants'

const step1Schema = z.object({
  firstName: z.string().min(1, 'First name is required').max(50),
  lastName: z.string().min(1, 'Last name is required').max(50),
  email: z.string().email('Enter a valid email'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
})

const step2Schema = z.object({
  networkName: z.string().min(1, 'Network name is required').max(100),
  networkSlug: z
    .string()
    .min(3, 'Slug must be at least 3 characters')
    .max(50)
    .regex(/^[a-z0-9-]+$/, 'Only lowercase letters, numbers, and hyphens'),
  networkDescription: z.string().max(300).optional(),
  networkType: z.string().min(1, 'Organisation type is required'),
})

type Step1Data = z.infer<typeof step1Schema>
type Step2Data = z.infer<typeof step2Schema>

export function RegisterPage() {
  const navigate = useNavigate()
  const [step, setStep] = useState(1)
  const [step1Data, setStep1Data] = useState<Step1Data | null>(null)

  const form1 = useForm<Step1Data>({ resolver: zodResolver(step1Schema) })
  const form2 = useForm<Step2Data>({ resolver: zodResolver(step2Schema) })

  const handleStep1 = (data: Step1Data) => {
    setStep1Data(data)
    setStep(2)
  }

  const handleNetworkNameChange = (name: string) => {
    const slug = generateSlug(name)
    form2.setValue('networkSlug', slug)
  }

  const handleSubmit = async (data: Step2Data) => {
    if (!step1Data) return

    try {
      await authApi.register({
        ...step1Data,
        ...data,
      })
      toast.success('Account created! Check your email to verify your account.')
      navigate('/verify-email')
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Registration failed')
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-green-600 text-white text-2xl font-bold">
            C
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Create your network</h1>
        </div>

        {/* Step indicators */}
        <div className="mb-6 flex items-center justify-center gap-4">
          {[1, 2].map((s) => (
            <div key={s} className="flex items-center gap-2">
              <div
                className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-medium
                  ${s < step ? 'bg-green-600 text-white' : s === step ? 'border-2 border-green-600 text-green-600' : 'border-2 border-gray-200 text-gray-400'}`}
              >
                {s < step ? <CheckCircle className="h-4 w-4" /> : s}
              </div>
              <span className={`text-sm ${s === step ? 'font-medium text-gray-900' : 'text-gray-400'}`}>
                {s === 1 ? 'Your Account' : 'Your Network'}
              </span>
              {s < 2 && <div className="ml-2 h-px w-8 bg-gray-200" />}
            </div>
          ))}
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{step === 1 ? 'Account Details' : 'Network Details'}</CardTitle>
            <CardDescription>
              {step === 1
                ? 'Create your Collecta account'
                : 'Set up your community network'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {step === 1 && (
              <form onSubmit={form1.handleSubmit(handleStep1)} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="firstName">First Name</Label>
                    <Input
                      id="firstName"
                      placeholder="Amaka"
                      error={form1.formState.errors.firstName?.message}
                      {...form1.register('firstName')}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="lastName">Last Name</Label>
                    <Input
                      id="lastName"
                      placeholder="Okafor"
                      error={form1.formState.errors.lastName?.message}
                      {...form1.register('lastName')}
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="amaka@example.com"
                    error={form1.formState.errors.email?.message}
                    {...form1.register('email')}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="Min 8 characters"
                    error={form1.formState.errors.password?.message}
                    {...form1.register('password')}
                  />
                </div>

                <Button type="submit" className="w-full">
                  Continue
                </Button>
              </form>
            )}

            {step === 2 && (
              <form onSubmit={form2.handleSubmit(handleSubmit)} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="networkName">Network Name</Label>
                  <Input
                    id="networkName"
                    placeholder="Greenpark Estate"
                    error={form2.formState.errors.networkName?.message}
                    {...form2.register('networkName', {
                      onChange: (e) => handleNetworkNameChange(e.target.value),
                    })}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="networkSlug">Network Slug</Label>
                  <div className="flex items-center gap-0.5">
                    <span className="flex h-10 items-center rounded-l-md border border-r-0 bg-gray-50 px-3 text-sm text-gray-500">
                      collecta.services/n/
                    </span>
                    <Input
                      id="networkSlug"
                      placeholder="greenpark"
                      className="rounded-l-none"
                      error={form2.formState.errors.networkSlug?.message}
                      {...form2.register('networkSlug')}
                    />
                  </div>
                  <p className="text-xs text-gray-500">
                    Your members will pay at: collecta.services/n/<strong>{form2.watch('networkSlug') || 'yourslug'}</strong>
                  </p>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="networkDescription">Description (optional)</Label>
                  <Textarea
                    id="networkDescription"
                    placeholder="Brief description of your community..."
                    {...form2.register('networkDescription')}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="networkType">Organisation Type</Label>
                  <Select
                    id="networkType"
                    placeholder="Select organisation type"
                    options={NETWORK_TYPES}
                    error={form2.formState.errors.networkType?.message}
                    {...form2.register('networkType')}
                  />
                </div>

                <div className="flex gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1"
                    onClick={() => setStep(1)}
                  >
                    Back
                  </Button>
                  <Button
                    type="submit"
                    className="flex-1"
                    isLoading={form2.formState.isSubmitting}
                  >
                    Create Network
                  </Button>
                </div>
              </form>
            )}

            <p className="mt-4 text-center text-sm text-gray-500">
              Already have an account?{' '}
              <Link to="/login" className="text-green-600 hover:underline font-medium">
                Sign in
              </Link>
            </p>
            <p className="mt-3 text-center text-xs text-gray-400">
              By registering you agree to our{' '}
              <Link to="/terms" className="underline">Terms</Link>{' '}and{' '}
              <Link to="/privacy" className="underline">Privacy Policy</Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
