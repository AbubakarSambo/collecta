import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import { CheckCircle, Info } from 'lucide-react'
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

const step3Schema = z.object({
  organisationName: z.string().min(1, 'Organisation name is required').max(200),
  cacNumber: z.string().max(50).optional(),
  bvn: z.string().max(20).optional(),
  nin: z.string().max(20).optional(),
  contactAddress: z.string().min(1, 'Contact address is required').max(300),
})

type Step1Data = z.infer<typeof step1Schema>
type Step2Data = z.infer<typeof step2Schema>
type Step3Data = z.infer<typeof step3Schema>

const PENDING_VERIFICATION_KEY = 'collecta-pending-verification'

export function RegisterPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const referralSource = searchParams.get('ref') || undefined
  const referredType = searchParams.get('type') || undefined
  const [step, setStep] = useState(1)
  const [step1Data, setStep1Data] = useState<Step1Data | null>(null)

  const form1 = useForm<Step1Data>({ resolver: zodResolver(step1Schema) })
  const form2 = useForm<Step2Data>({
    resolver: zodResolver(step2Schema),
    defaultValues: referredType ? { networkType: referredType } : undefined,
  })
  const form3 = useForm<Step3Data>({ resolver: zodResolver(step3Schema) })

  const handleStep1 = (data: Step1Data) => {
    setStep1Data(data)
    setStep(2)
  }

  const handleNetworkNameChange = (name: string) => {
    const slug = generateSlug(name)
    form2.setValue('networkSlug', slug)
    if (!form3.getValues('organisationName')) {
      form3.setValue('organisationName', name)
    }
  }

  const handleStep2 = async (data: Step2Data) => {
    if (!step1Data) return
    try {
      await authApi.register({
        ...step1Data,
        ...data,
        ...(referralSource ? { referralSource } : {}),
      })
      setStep(3)
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Registration failed')
    }
  }

  const handleStep3 = (data: Step3Data) => {
    localStorage.setItem(PENDING_VERIFICATION_KEY, JSON.stringify(data))
    toast.success('Account created! Check your email to verify your account.')
    navigate('/verify-email')
  }

  const handleSkipVerification = () => {
    toast.success('Account created! Check your email to verify your account.')
    navigate('/verify-email')
  }

  const STEP_LABELS = ['Your Account', 'Your Network', 'Verification']

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-black text-brand-500 text-2xl font-bold font-display">
            C
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Create your network</h1>
        </div>

        {/* Step indicators */}
        <div className="mb-6 flex items-center justify-center gap-2">
          {STEP_LABELS.map((label, idx) => {
            const s = idx + 1
            return (
              <div key={s} className="flex items-center gap-2">
                <div
                  className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-medium
                    ${s < step ? 'bg-primary text-primary-foreground' : s === step ? 'border-2 border-primary text-brand-700' : 'border-2 border-gray-200 text-gray-400'}`}
                >
                  {s < step ? <CheckCircle className="h-4 w-4" /> : s}
                </div>
                <span className={`text-sm ${s === step ? 'font-medium text-gray-900' : 'text-gray-400'}`}>
                  {label}
                </span>
                {s < 3 && <div className="ml-2 h-px w-6 bg-gray-200" />}
              </div>
            )
          })}
        </div>

        <Card>
          <CardHeader>
            <CardTitle>
              {step === 1 ? 'Account Details' : step === 2 ? 'Network Details' : 'Verify Your Organisation'}
            </CardTitle>
            <CardDescription>
              {step === 1
                ? 'Create your Collecta account'
                : step === 2
                ? 'Set up your community network'
                : 'Required before your portal can go live'}
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
              <form onSubmit={form2.handleSubmit(handleStep2)} className="space-y-4">
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
                      collecta.services/pay/
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
                    Your members will pay at: collecta.services/pay/<strong>{form2.watch('networkSlug') || 'yourslug'}</strong>
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
                    Continue
                  </Button>
                </div>
              </form>
            )}

            {step === 3 && (
              <form onSubmit={form3.handleSubmit(handleStep3)} className="space-y-4">
                {/* Info banner */}
                <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 space-y-1.5">
                  <div className="flex items-center gap-2">
                    <Info className="h-4 w-4 text-blue-600 shrink-0" />
                    <p className="text-sm font-semibold text-blue-900">Verification is required to go live</p>
                  </div>
                  <p className="text-xs text-blue-800 leading-relaxed">
                    Collecta cannot hold funds on your behalf — payments go directly to your bank account.
                    To activate your payment portal, you'll need to submit verification details and connect a bank account.
                    Reviewed within 24 hours.
                  </p>
                  <p className="text-xs text-blue-700 font-medium">
                    Have ready: your BVN or CAC number, and your bank account number.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="organisationName">Organisation name</Label>
                  <Input
                    id="organisationName"
                    placeholder="Greenpark Estate Residents Association"
                    error={form3.formState.errors.organisationName?.message}
                    {...form3.register('organisationName')}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="cacNumber">CAC number (optional)</Label>
                    <Input id="cacNumber" placeholder="RC1234567" {...form3.register('cacNumber')} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="bvn">BVN (individual collectors)</Label>
                    <Input id="bvn" placeholder="12345678901" {...form3.register('bvn')} />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="nin">NIN (optional)</Label>
                  <Input id="nin" placeholder="12345678901" {...form3.register('nin')} />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="contactAddress">Contact address</Label>
                  <Input
                    id="contactAddress"
                    placeholder="12 Main Street, Lagos"
                    error={form3.formState.errors.contactAddress?.message}
                    {...form3.register('contactAddress')}
                  />
                </div>

                <div className="flex gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1"
                    onClick={handleSkipVerification}
                  >
                    Skip for now
                  </Button>
                  <Button type="submit" className="flex-1">
                    Submit &amp; Continue
                  </Button>
                </div>
              </form>
            )}

            <p className="mt-4 text-center text-sm text-gray-500">
              Already have an account?{' '}
              <Link to="/login" className="text-brand-700 hover:underline font-medium">
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
