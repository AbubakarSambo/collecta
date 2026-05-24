import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { CheckCircle2, AlertCircle, Building2 } from 'lucide-react'
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

  const onSubmit = (data: SetupFormData) => {
    if (!verifiedName) {
      toast.error('Please verify your account first')
      return
    }
    setupMutation.mutate(data)
  }

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
    </div>
  )
}
