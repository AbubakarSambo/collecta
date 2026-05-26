import { useQuery } from '@tanstack/react-query'
import { Users, TrendingUp, AlertTriangle, Clock, Send, UserPlus, PartyPopper, Copy, Check, ChevronDown, ChevronUp, MessageSquare, UserX, ShieldAlert } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { chargesApi } from '@/api/charges'
import { paymentsApi } from '@/api/payments'
import { reportsApi } from '@/api/reports'
import { useNetwork } from '@/hooks/useNetwork'
import { StatsCard } from '@/components/shared/StatsCard'
import { PageHeader } from '@/components/shared/PageHeader'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { StatusBadge } from '@/components/ui/Badge'
import { formatCurrency, formatDate } from '@/lib/utils'
import { FullPageSpinner } from '@/components/ui/Spinner'
import { getNetworkVocab } from '@/lib/networkTypes'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'

const ONBOARDING_DISMISSED_KEY = 'collecta-onboarding-dismissed'

export function DashboardPage() {
  const navigate = useNavigate()
  const { network, networkId, isLoading: networkLoading } = useNetwork()
  const [onboardingDismissed, setOnboardingDismissed] = useState(
    () => !!localStorage.getItem(ONBOARDING_DISMISSED_KEY),
  )
  const [copied, setCopied] = useState<string | null>(null)
  const [templatesOpen, setTemplatesOpen] = useState(false)

  const dismissOnboarding = () => {
    localStorage.setItem(ONBOARDING_DISMISSED_KEY, '1')
    setOnboardingDismissed(true)
  }

  const copyText = (text: string, key: string) => {
    navigator.clipboard.writeText(text)
    setCopied(key)
    setTimeout(() => setCopied(null), 2000)
  }

  const portalLink = `${window.location.origin}/pay/${network?.slug}`

  const vocab = getNetworkVocab(network?.networkType)
  const noun = vocab.memberNounPlural

  const whatsappTemplate = network
    ? `Hi! ${network.name} now uses Collecta to manage payments. You can view your charges and pay online here: ${portalLink}\n\nNo login needed — just visit the link. Your receipts are digital and permanent.`
    : ''

  const smsTemplate = network
    ? `${network.name}: Pay dues online at ${portalLink}. View charges, pay securely, get instant receipt.`
    : ''

  const { data: summaryRes, isLoading: summaryLoading } = useQuery({
    queryKey: ['charges', 'summary', networkId],
    queryFn: () => chargesApi.getSummary(networkId!),
    enabled: !!networkId,
    select: (r) => r.data,
  })

  const { data: paymentsRes, isLoading: paymentsLoading } = useQuery({
    queryKey: ['payments', networkId, 'recent'],
    queryFn: () => paymentsApi.list(networkId!, { limit: 8 }),
    enabled: !!networkId,
    select: (r) => r.data,
  })

  const { data: reportRes } = useQuery({
    queryKey: ['reports', 'collection', networkId],
    queryFn: () => reportsApi.collection(networkId!, 6),
    enabled: !!networkId,
    select: (r) => r.data,
  })

  if (networkLoading || summaryLoading) {
    return <FullPageSpinner />
  }

  const summary = summaryRes
  const payments = paymentsRes?.data || []
  const chartData = reportRes?.monthlyTrend || []

  return (
    <div className="p-6 space-y-6">
      {/* Onboarding banner — shown once after verification approval */}
      {network?.verificationStatus === 'APPROVED' && network?.isVerified && !onboardingDismissed && (
        <div className="rounded-lg border border-green-300 bg-green-50 px-4 py-4 space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2">
              <PartyPopper className="h-5 w-5 text-green-700 shrink-0" />
              <p className="text-sm font-semibold text-green-900">Your portal is live!</p>
            </div>
            <button onClick={dismissOnboarding} className="text-xs text-green-600 hover:underline shrink-0">
              Dismiss
            </button>
          </div>

          <p className="text-sm text-green-800">
            Share this link with your {noun} so they can view charges and pay online:
          </p>

          <div className="flex items-center gap-2">
            <code className="flex-1 rounded bg-white border border-green-200 px-3 py-2 text-xs font-mono text-gray-700 truncate">
              {portalLink}
            </code>
            <button
              onClick={() => copyText(portalLink, 'link')}
              className="flex items-center gap-1 rounded border border-green-300 bg-white px-3 py-2 text-xs font-medium text-green-700 hover:bg-green-50 shrink-0"
            >
              {copied === 'link' ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              {copied === 'link' ? 'Copied' : 'Copy link'}
            </button>
          </div>

          {/* Message templates */}
          <button
            onClick={() => setTemplatesOpen((o) => !o)}
            className="flex items-center gap-1.5 text-xs font-medium text-green-700 hover:text-green-900"
          >
            <MessageSquare className="h-3.5 w-3.5" />
            Copy-paste message templates for WhatsApp & SMS
            {templatesOpen ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          </button>

          {templatesOpen && (
            <div className="space-y-3 pt-1">
              {/* WhatsApp template */}
              <div className="rounded-lg bg-white border border-green-200 p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">WhatsApp</span>
                  <button
                    onClick={() => copyText(whatsappTemplate, 'whatsapp')}
                    className="flex items-center gap-1 text-xs text-green-700 hover:text-green-900 font-medium"
                  >
                    {copied === 'whatsapp' ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                    {copied === 'whatsapp' ? 'Copied' : 'Copy'}
                  </button>
                </div>
                <p className="text-xs text-gray-700 whitespace-pre-wrap leading-relaxed">{whatsappTemplate}</p>
              </div>

              {/* SMS template */}
              <div className="rounded-lg bg-white border border-green-200 p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">SMS</span>
                  <button
                    onClick={() => copyText(smsTemplate, 'sms')}
                    className="flex items-center gap-1 text-xs text-green-700 hover:text-green-900 font-medium"
                  >
                    {copied === 'sms' ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                    {copied === 'sms' ? 'Copied' : 'Copy'}
                  </button>
                </div>
                <p className="text-xs text-gray-700">{smsTemplate}</p>
                <p className="text-xs text-gray-400 mt-1">{smsTemplate.length}/160 characters</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Permanent templates section shown after onboarding is dismissed (or after verification) */}
      {network?.verificationStatus === 'APPROVED' && network?.isVerified && onboardingDismissed && (
        <div className="rounded-lg border bg-white px-4 py-3">
          <button
            onClick={() => setTemplatesOpen((o) => !o)}
            className="flex w-full items-center justify-between text-sm font-medium text-gray-700 hover:text-gray-900"
          >
            <span className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-green-600" />
              Communication Templates
            </span>
            {templatesOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>

          {templatesOpen && (
            <div className="mt-3 space-y-3">
              <p className="text-xs text-gray-500">
                Share your portal link with {noun}:
              </p>
              <div className="flex items-center gap-2">
                <code className="flex-1 rounded bg-gray-50 border px-3 py-2 text-xs font-mono text-gray-700 truncate">
                  {portalLink}
                </code>
                <button
                  onClick={() => copyText(portalLink, 'link')}
                  className="flex items-center gap-1 rounded border px-3 py-2 text-xs font-medium text-gray-600 hover:bg-gray-50 shrink-0"
                >
                  {copied === 'link' ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                  {copied === 'link' ? 'Copied' : 'Copy'}
                </button>
              </div>
              <div className="rounded-lg bg-gray-50 border p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">WhatsApp</span>
                  <button
                    onClick={() => copyText(whatsappTemplate, 'whatsapp')}
                    className="flex items-center gap-1 text-xs text-gray-600 hover:text-gray-900 font-medium"
                  >
                    {copied === 'whatsapp' ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                    {copied === 'whatsapp' ? 'Copied' : 'Copy'}
                  </button>
                </div>
                <p className="text-xs text-gray-700 whitespace-pre-wrap leading-relaxed">{whatsappTemplate}</p>
              </div>
              <div className="rounded-lg bg-gray-50 border p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">SMS</span>
                  <button
                    onClick={() => copyText(smsTemplate, 'sms')}
                    className="flex items-center gap-1 text-xs text-gray-600 hover:text-gray-900 font-medium"
                  >
                    {copied === 'sms' ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                    {copied === 'sms' ? 'Copied' : 'Copy'}
                  </button>
                </div>
                <p className="text-xs text-gray-700">{smsTemplate}</p>
                <p className="text-xs text-gray-400 mt-1">{smsTemplate.length}/160 characters</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Bank account banner — verified but no bank account connected */}
      {network?.isVerified && !network?.paystackSubaccountCode && (
        <div className="rounded-lg border border-orange-200 bg-orange-50 px-4 py-3 flex items-center justify-between gap-4">
          <p className="text-sm text-orange-800">
            <span className="font-semibold">Connect a bank account to go live.</span> Your organisation is verified but your portal cannot accept payments until a bank account is connected.
          </p>
          <a
            href="/settings?tab=paystack"
            className="shrink-0 text-xs font-medium text-orange-800 underline hover:text-orange-900"
          >
            Connect now
          </a>
        </div>
      )}

      {/* Verification banner */}
      {!network?.isVerified && !network?.hasSubmittedVerification && (
        <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 flex items-center justify-between gap-4">
          <p className="text-sm text-blue-800">
            <span className="font-semibold">Verify your organisation</span> — Submit your details to go live and start collecting payments.
          </p>
          <a
            href="/settings?tab=verification"
            className="shrink-0 text-xs font-medium text-blue-800 underline hover:text-blue-900"
          >
            Get verified
          </a>
        </div>
      )}
      {!network?.isVerified && network?.hasSubmittedVerification && network?.verificationStatus === 'PENDING' && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 flex items-center justify-between gap-4">
          <p className="text-sm text-amber-800">
            <span className="font-semibold">Verification pending</span> — Your portal will go live once our team reviews your organisation. You can add members and create fees while you wait. Usually completed within 24 hours.
          </p>
          <a
            href="/settings?tab=verification"
            className="shrink-0 text-xs font-medium text-amber-800 underline hover:text-amber-900"
          >
            View status
          </a>
        </div>
      )}
      {network?.verificationStatus === 'REJECTED' && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 flex items-center justify-between gap-4">
          <p className="text-sm text-red-800">
            <span className="font-semibold">Verification rejected</span>
            {network?.verificationNotes ? ` — ${network.verificationNotes}` : ''}. Please resubmit or contact{' '}
            <a href="mailto:support@collecta.services" className="underline font-medium">
              support@collecta.services
            </a>.
          </p>
          <a
            href="/settings?tab=verification"
            className="shrink-0 text-xs font-medium text-red-800 underline hover:text-red-900"
          >
            Resubmit
          </a>
        </div>
      )}

      <PageHeader
        title={`${network?.name || 'Dashboard'}`}
        description="Overview of your network's financial activity"
        action={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => navigate('/reminders')} size="sm">
              <Send className="h-4 w-4" />
              Send Reminder
            </Button>
            <Button onClick={() => navigate('/members')} size="sm">
              <UserPlus className="h-4 w-4" />
              Add Member
            </Button>
          </div>
        }
      />

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Total Members"
          value={summary?.totalMembers || 0}
          icon={Users}
          iconColor="text-blue-600"
          iconBg="bg-blue-100"
        />
        <StatsCard
          title="Collected This Month"
          value={formatCurrency(Number(summary?.collectedThisMonth || 0))}
          icon={TrendingUp}
          iconColor="text-green-600"
          iconBg="bg-green-100"
        />
        <StatsCard
          title="Outstanding"
          value={formatCurrency(Number(summary?.pendingChargesAmount || 0))}
          icon={Clock}
          iconColor="text-yellow-600"
          iconBg="bg-yellow-100"
          description={`${summary?.pendingChargesCount || 0} charges`}
        />
        <StatsCard
          title="Overdue"
          value={formatCurrency(Number(summary?.overdueChargesAmount || 0))}
          icon={AlertTriangle}
          iconColor="text-red-600"
          iconBg="bg-red-100"
          description={`${summary?.overdueChargesCount || 0} charges`}
        />
        {(summary?.ghostMemberCount || 0) > 0 && (
          <StatsCard
            title="Ghost Members"
            value={summary?.ghostMemberCount || 0}
            icon={UserX}
            iconColor="text-gray-500"
            iconBg="bg-gray-100"
            description="Active, assigned, never paid"
          />
        )}
        {(summary?.persistentNonPayerCount || 0) > 0 && (
          <StatsCard
            title="Persistent Non-Payers"
            value={summary?.persistentNonPayerCount || 0}
            icon={ShieldAlert}
            iconColor="text-orange-600"
            iconBg="bg-orange-100"
            description="Overdue in 2+ months"
          />
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Collection Chart */}
        <Card>
          <CardHeader>
            <CardTitle>6-Month Collection Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip
                  formatter={(v) => formatCurrency(Number(v ?? 0))}
                />
                <Bar dataKey="collected" fill="#16a34a" name="Collected" radius={[3, 3, 0, 0]} />
                <Bar dataKey="outstanding" fill="#fbbf24" name="Outstanding" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Recent Payments */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Payments</CardTitle>
          </CardHeader>
          <CardContent>
            {paymentsLoading ? (
              <p className="text-sm text-gray-500">Loading...</p>
            ) : payments.length === 0 ? (
              <p className="text-sm text-gray-500">No payments recorded yet</p>
            ) : (
              <div className="space-y-3">
                {payments.map((p: any) => (
                  <div key={p.id} className="flex items-center justify-between py-1">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 text-xs font-medium text-gray-600">
                        {p.member?.firstName?.charAt(0)}{p.member?.lastName?.charAt(0)}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {p.member?.firstName} {p.member?.lastName}
                        </p>
                        <p className="text-xs text-gray-500">{formatDate(p.createdAt)}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-green-700">{formatCurrency(Number(p.amount))}</p>
                      <StatusBadge status={p.method} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
