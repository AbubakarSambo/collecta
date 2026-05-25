import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { CheckCircle2, AlertCircle, Building2, MessageSquare, ShieldCheck, Clock, XCircle } from 'lucide-react'
import { networksApi, paystackApi } from '@/api/networks'
import { useNetwork } from '@/hooks/useNetwork'
import { PageHeader } from '@/components/shared/PageHeader'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Label } from '@/components/ui/Label'
import { Textarea } from '@/components/ui/Textarea'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card'
import { cn } from '@/lib/utils'

const TABS = [
  { id: 'network', label: 'Network Info' },
  { id: 'paystack', label: 'Paystack' },
  { id: 'sms', label: 'SMS Credits' },
  { id: 'verification', label: 'Verification' },
]

const SMS_BUNDLES = [
  { credits: 100, price: 600 },
  { credits: 500, price: 3000 },
  { credits: 1000, price: 6000 },
  { credits: 5000, price: 28500, note: '5% discount' },
]

const setupSchema = z.object({
  bankCode: z.string().min(1, 'Bank is required'),
  accountNumber: z
    .string()
    .min(10, 'Account number must be 10 digits')
    .max(10, 'Account number must be 10 digits'),
})

type SetupFormData = z.infer<typeof setupSchema>

export function SettingsPage() {
  const { network, isLoading: networkLoading } = useNetwork()
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState('network')
  const [verifiedName, setVerifiedName] = useState<string | null>(null)

  const networkForm = useForm({
    values: {
      name: network?.name || '',
      description: network?.description || '',
      logoUrl: network?.logoUrl || '',
      timezone: network?.timezone || 'Africa/Lagos',
    },
  })

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<SetupFormData>({
    resolver: zodResolver(setupSchema),
    defaultValues: { bankCode: '', accountNumber: '' },
  })

  const bankCode = watch('bankCode')
  const accountNumber = watch('accountNumber')

  const updateMutation = useMutation({
    mutationFn: (data: any) => networksApi.updateNetwork(data),
    onSuccess: () => {
      toast.success('Settings saved')
      queryClient.invalidateQueries({ queryKey: ['network', 'me'] })
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || 'Failed to save'),
  })

  const { data: paystackStatus, isLoading: statusLoading } = useQuery({
    queryKey: ['paystack-status'],
    queryFn: () => networksApi.getPaystackStatus(),
    enabled: activeTab === 'paystack',
  })

  const { data: banks, isLoading: banksLoading } = useQuery({
    queryKey: ['paystack-banks'],
    queryFn: () => paystackApi.getBanks(),
    enabled: activeTab === 'paystack',
  })

  const verifyMutation = useMutation({
    mutationFn: () => paystackApi.verifyAccount({ accountNumber, bankCode }),
    onSuccess: (data) => {
      setVerifiedName(data.account_name)
      toast.success(`Account verified: ${data.account_name}`)
    },
    onError: (err: any) => {
      setVerifiedName(null)
      toast.error(err?.response?.data?.message || 'Could not verify account')
    },
  })

  const setupMutation = useMutation({
    mutationFn: (data: SetupFormData) => networksApi.setupPaystack(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['paystack-status'] })
      toast.success('Paystack connected — payments will go directly to your bank account')
    },
    onError: (err: any) =>
      toast.error(err?.response?.data?.message || 'Setup failed, please try again'),
  })

  const { data: smsCreditsData, isLoading: smsLoading } = useQuery({
    queryKey: ['sms-credits'],
    queryFn: () => networksApi.getSmsCredits(),
    enabled: activeTab === 'sms',
  })

  const topUpMutation = useMutation({
    mutationFn: (bundle: number) => networksApi.topUpSmsCredits(bundle),
    onSuccess: () => {
      toast.success('SMS credits purchased successfully')
      queryClient.invalidateQueries({ queryKey: ['sms-credits'] })
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || 'Top-up failed'),
  })

  const onSubmit = (data: SetupFormData) => {
    if (!verifiedName) {
      toast.error('Please verify your account first')
      return
    }
    setupMutation.mutate(data)
  }

  const verificationForm = useForm({
    defaultValues: {
      organisationName: '',
      cacNumber: '',
      bvn: '',
      nin: '',
      contactAddress: '',
    },
  })

  const verificationMutation = useMutation({
    mutationFn: (data: any) => networksApi.submitVerification(data),
    onSuccess: () => {
      toast.success('Verification request submitted — our team will review within 24 hours')
      queryClient.invalidateQueries({ queryKey: ['network', 'me'] })
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || 'Submission failed'),
  })

  return (
    <div className="p-6 space-y-6">
      <PageHeader title="Settings" description="Manage your network settings" />

      <div className="flex gap-1 rounded-lg border bg-gray-50 p-1 w-fit">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              'rounded-md px-4 py-2 text-sm font-medium transition-colors',
              activeTab === tab.id
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700',
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'network' && (
        <Card>
          <CardHeader>
            <CardTitle>Network Information</CardTitle>
          </CardHeader>
          <CardContent>
            <form
              onSubmit={networkForm.handleSubmit((d) => updateMutation.mutate(d))}
              className="space-y-4 max-w-lg"
            >
              <div>
                <Label>Network Name</Label>
                <Input {...networkForm.register('name')} />
              </div>
              <div>
                <Label>Description</Label>
                <Textarea rows={3} {...networkForm.register('description')} />
              </div>
              <div>
                <Label>Logo URL</Label>
                <Input type="url" placeholder="https://..." {...networkForm.register('logoUrl')} />
              </div>
              <div>
                <Label>Timezone</Label>
                <Input {...networkForm.register('timezone')} />
              </div>
              <Button type="submit" isLoading={updateMutation.isPending}>
                Save Changes
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {activeTab === 'sms' && (
        <div className="space-y-4 max-w-2xl">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-green-600" />
                SMS Credits
              </CardTitle>
              <CardDescription>
                Purchase credits to send SMS reminders to your members
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Current balance */}
              <div className="rounded-lg border bg-gray-50 px-4 py-3">
                {smsLoading ? (
                  <div className="h-6 w-40 animate-pulse rounded bg-gray-200" />
                ) : (
                  <p className="text-sm font-medium text-gray-900">
                    <span className="text-2xl font-bold text-green-700">
                      {(smsCreditsData?.credits ?? 0).toLocaleString()}
                    </span>{' '}
                    credits remaining
                  </p>
                )}
              </div>

              {/* Top-up bundles */}
              <div>
                <p className="mb-3 text-sm font-medium text-gray-700">Top-up bundles</p>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {SMS_BUNDLES.map((bundle) => (
                    <button
                      key={bundle.credits}
                      type="button"
                      onClick={() => topUpMutation.mutate(bundle.credits)}
                      disabled={topUpMutation.isPending}
                      className="flex flex-col items-center rounded-lg border border-gray-200 bg-white px-3 py-4 text-center transition-colors hover:border-green-400 hover:bg-green-50 disabled:opacity-50"
                    >
                      <span className="text-lg font-bold text-gray-900">
                        {bundle.credits.toLocaleString()}
                      </span>
                      <span className="text-xs text-gray-500">credits</span>
                      <span className="mt-2 text-sm font-semibold text-green-700">
                        ₦{bundle.price.toLocaleString()}
                      </span>
                      {bundle.note && (
                        <span className="mt-1 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                          {bundle.note}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Info note */}
              <p className="text-xs text-gray-500 border-t pt-4">
                1 credit = 1 SMS. Credits are also earned automatically when members pay online (200 credits per ₦1,000 in service charges collected).
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === 'paystack' && (
        <div className="space-y-4 max-w-2xl">
          {/* Status card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {paystackStatus?.isSetup ? (
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                ) : (
                  <AlertCircle className="h-5 w-5 text-yellow-500" />
                )}
                Payment Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              {statusLoading ? (
                <div className="h-16 animate-pulse rounded bg-gray-100" />
              ) : paystackStatus?.isSetup ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500">Status</span>
                    <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">
                      Connected
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500">Bank</span>
                    <span className="text-sm font-medium">{paystackStatus.settlementBank}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500">Account Name</span>
                    <span className="text-sm font-medium">{paystackStatus.bankAccountName}</span>
                  </div>
                </div>
              ) : (
                <div className="py-4 text-center">
                  <Building2 className="mx-auto h-10 w-10 text-gray-400" />
                  <p className="mt-2 text-sm text-gray-500">
                    Connect your bank account to receive payments directly
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Setup form — only shown when not yet connected */}
          {!paystackStatus?.isSetup && (
            <Card>
              <CardHeader>
                <CardTitle>Connect Bank Account</CardTitle>
                <CardDescription>
                  Verify your bank details to start receiving member payments
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                  <div>
                    <Label>Bank</Label>
                    <Select
                      placeholder="Select your bank"
                      options={
                        banks?.map((b) => ({ value: b.code, label: b.name })) ?? []
                      }
                      disabled={banksLoading}
                      error={errors.bankCode?.message}
                      {...register('bankCode')}
                    />
                  </div>

                  <div>
                    <Label>Account Number</Label>
                    <div className="flex gap-2">
                      <Input
                        placeholder="0123456789"
                        maxLength={10}
                        error={errors.accountNumber?.message}
                        {...register('accountNumber')}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => verifyMutation.mutate()}
                        disabled={!bankCode || accountNumber.length !== 10}
                        isLoading={verifyMutation.isPending}
                      >
                        Verify
                      </Button>
                    </div>
                  </div>

                  {verifiedName && (
                    <div className="rounded-lg border border-green-200 bg-green-50 p-3">
                      <p className="flex items-center gap-2 text-sm text-green-700">
                        <CheckCircle2 className="h-4 w-4 shrink-0" />
                        Account verified: <span className="font-medium">{verifiedName}</span>
                      </p>
                    </div>
                  )}

                  <div className="pt-2">
                    <Button
                      type="submit"
                      disabled={!verifiedName}
                      isLoading={setupMutation.isPending}
                    >
                      Connect Account
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Verification tab */}
      {activeTab === 'verification' && (
        <div className="space-y-4">
          {network?.verificationStatus === 'APPROVED' && (
            <Card className="border-green-200 bg-green-50">
              <CardContent className="p-4 flex items-center gap-3">
                <ShieldCheck className="h-6 w-6 text-green-600 shrink-0" />
                <div>
                  <p className="font-semibold text-green-900">Verified</p>
                  <p className="text-sm text-green-700">Your organisation has been verified by Collecta. Your portal is live.</p>
                </div>
              </CardContent>
            </Card>
          )}

          {network?.verificationStatus === 'PENDING' && (
            <Card className="border-amber-200 bg-amber-50">
              <CardContent className="p-4 flex items-center gap-3">
                <Clock className="h-6 w-6 text-amber-600 shrink-0" />
                <div>
                  <p className="font-semibold text-amber-900">Review in progress</p>
                  <p className="text-sm text-amber-700">Your verification request has been submitted. Our team will review within 24 hours.</p>
                </div>
              </CardContent>
            </Card>
          )}

          {network?.verificationStatus === 'REJECTED' && (
            <Card className="border-red-200 bg-red-50">
              <CardContent className="p-4 flex items-center gap-3">
                <XCircle className="h-6 w-6 text-red-600 shrink-0" />
                <div>
                  <p className="font-semibold text-red-900">Verification rejected</p>
                  <p className="text-sm text-red-700">
                    {network?.verificationNotes || 'Please contact support@collecta.africa for details.'}
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {network?.verificationStatus !== 'APPROVED' && (
            <Card>
              <CardHeader>
                <CardTitle>Submit Verification Request</CardTitle>
                <CardDescription>
                  Collecta verifies organisations before activating their payment portal. Reviewed within 24 hours.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form
                  onSubmit={verificationForm.handleSubmit((data) => verificationMutation.mutate(data))}
                  className="space-y-4"
                >
                  <div className="space-y-1">
                    <Label>Organisation name</Label>
                    <Input
                      {...verificationForm.register('organisationName', { required: true })}
                      placeholder="Greenpark Estate Residents Association"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label>CAC number (optional)</Label>
                      <Input {...verificationForm.register('cacNumber')} placeholder="RC1234567" />
                    </div>
                    <div className="space-y-1">
                      <Label>BVN (individual collectors)</Label>
                      <Input {...verificationForm.register('bvn')} placeholder="12345678901" />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label>NIN (optional)</Label>
                    <Input {...verificationForm.register('nin')} placeholder="12345678901" />
                  </div>
                  <div className="space-y-1">
                    <Label>Contact address</Label>
                    <Input
                      {...verificationForm.register('contactAddress', { required: true })}
                      placeholder="12 Main Street, Lagos"
                    />
                  </div>
                  <Button
                    type="submit"
                    isLoading={verificationMutation.isPending}
                    disabled={verificationMutation.isPending}
                  >
                    Submit for Review
                  </Button>
                </form>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  )
}
