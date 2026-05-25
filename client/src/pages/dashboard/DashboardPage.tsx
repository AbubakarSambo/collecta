import { useQuery } from '@tanstack/react-query'
import { Users, TrendingUp, AlertTriangle, Clock, Send, UserPlus, PartyPopper, Copy, Check } from 'lucide-react'
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
  const [copied, setCopied] = useState(false)

  const dismissOnboarding = () => {
    localStorage.setItem(ONBOARDING_DISMISSED_KEY, '1')
    setOnboardingDismissed(true)
  }

  const copyPortalLink = () => {
    if (network?.slug) {
      navigator.clipboard.writeText(`${window.location.origin}/n/${network.slug}`)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

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
            <button
              onClick={dismissOnboarding}
              className="text-xs text-green-600 hover:underline shrink-0"
            >
              Dismiss
            </button>
          </div>
          <p className="text-sm text-green-800">
            Share your portal link with your members so they can view charges and pay online:
          </p>
          <div className="flex items-center gap-2">
            <code className="flex-1 rounded bg-white border border-green-200 px-3 py-2 text-xs font-mono text-gray-700 truncate">
              {window.location.origin}/n/{network?.slug}
            </code>
            <button
              onClick={copyPortalLink}
              className="flex items-center gap-1 rounded border border-green-300 bg-white px-3 py-2 text-xs font-medium text-green-700 hover:bg-green-50"
            >
              {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              {copied ? 'Copied' : 'Copy'}
            </button>
          </div>
          <p className="text-xs text-green-700">
            Check your email for copy-paste WhatsApp and SMS message templates.
          </p>
        </div>
      )}

      {/* Verification banner */}
      {network?.verificationStatus === 'PENDING' && !network?.isVerified && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
          <p className="text-sm text-amber-800">
            <span className="font-semibold">Verification pending</span> — Your portal will go live once our team reviews your organisation. You can add members and create fees while you wait. Usually completed within 24 hours.
          </p>
        </div>
      )}
      {network?.verificationStatus === 'REJECTED' && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3">
          <p className="text-sm text-red-800">
            <span className="font-semibold">Verification rejected</span>
            {network?.verificationNotes ? ` — ${network.verificationNotes}` : ''}. Please contact{' '}
            <a href="mailto:support@collecta.africa" className="underline font-medium">
              support@collecta.africa
            </a>{' '}
            to resolve this.
          </p>
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
