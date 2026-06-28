import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  Send,
  Mail,
  Phone,
  MessageSquare,
  AlertTriangle,
  Info,
  PlusCircle,
  Trash2,
  Bell,
} from 'lucide-react'
import { remindersApi } from '@/api/reminders'
import { useNetwork } from '@/hooks/useNetwork'
import { useAnalytics } from '@/hooks/useAnalytics'
import { PageHeader } from '@/components/shared/PageHeader'
import { Button } from '@/components/ui/Button'
import { Textarea } from '@/components/ui/Textarea'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card'
import { StatusBadge } from '@/components/ui/Badge'
import { formatDate } from '@/lib/utils'
import { cn } from '@/lib/utils'

const CHANNELS = [
  { value: 'EMAIL', label: 'Email', icon: Mail },
  { value: 'SMS', label: 'SMS', icon: Phone },
  { value: 'WHATSAPP', label: 'WhatsApp', icon: MessageSquare },
]

// Preset trigger days with labels
const TRIGGER_PRESETS = [
  { daysOffset: -7, label: '7 days before due' },
  { daysOffset: -3, label: '3 days before due' },
  { daysOffset: -1, label: '1 day before due' },
  { daysOffset: 0, label: 'On the due date' },
  { daysOffset: 3, label: '3 days after due' },
  { daysOffset: 5, label: '5 days after due' },
  { daysOffset: 7, label: '7 days after due' },
  { daysOffset: 14, label: '14 days after due' },
]

function formatDaysOffset(daysOffset: number): string {
  if (daysOffset === 0) return 'On the due date'
  if (daysOffset < 0) return `${Math.abs(daysOffset)} day${Math.abs(daysOffset) === 1 ? '' : 's'} before due`
  return `${daysOffset} day${daysOffset === 1 ? '' : 's'} after due`
}

function getToneLabel(daysOffset: number): { label: string; color: string } {
  if (daysOffset < 0) return { label: 'Friendly', color: 'text-green-600 bg-green-50 border-green-200' }
  if (daysOffset === 0) return { label: 'Clear', color: 'text-blue-600 bg-blue-50 border-blue-200' }
  if (daysOffset < 5) return { label: 'Firm', color: 'text-orange-600 bg-orange-50 border-orange-200' }
  return { label: 'Formal', color: 'text-red-600 bg-red-50 border-red-200' }
}

function RuleSchedule({ networkId }: { networkId: string }) {
  const queryClient = useQueryClient()
  const { track } = useAnalytics()
  const [newDaysOffset, setNewDaysOffset] = useState<number>(0)
  const [newChannels, setNewChannels] = useState<string[]>(['EMAIL'])
  const [showCustom, setShowCustom] = useState(false)
  const [customDays, setCustomDays] = useState('')

  const { data: rules = [], isLoading } = useQuery({
    queryKey: ['reminder-rules', networkId],
    queryFn: () => remindersApi.getRules(networkId),
    enabled: !!networkId,
  })

  const createMutation = useMutation({
    mutationFn: (data: { daysOffset: number; channels: string[] }) =>
      remindersApi.createRule(networkId, data),
    onSuccess: (_, variables) => {
      track('reminder_rule_created', { daysOffset: variables.daysOffset, channels: variables.channels })
      toast.success('Reminder rule added')
      queryClient.invalidateQueries({ queryKey: ['reminder-rules', networkId] })
    },
    onError: (err: any) =>
      toast.error(err?.response?.data?.message || 'Failed to add rule'),
  })

  const deleteMutation = useMutation({
    mutationFn: (ruleId: string) => remindersApi.deleteRule(networkId, ruleId),
    onSuccess: (_, ruleId) => {
      track('reminder_rule_deleted', { ruleId })
      toast.success('Rule removed')
      queryClient.invalidateQueries({ queryKey: ['reminder-rules', networkId] })
    },
    onError: () => toast.error('Failed to remove rule'),
  })

  const toggleChannel = (channel: string) => {
    setNewChannels((prev) =>
      prev.includes(channel) ? prev.filter((c) => c !== channel) : [...prev, channel],
    )
  }

  const handleAdd = () => {
    if (newChannels.length === 0) {
      toast.error('Select at least one channel')
      return
    }
    const offset = showCustom ? parseInt(customDays, 10) : newDaysOffset
    if (isNaN(offset)) {
      toast.error('Enter a valid number of days')
      return
    }
    createMutation.mutate({ daysOffset: offset, channels: newChannels })
    setShowCustom(false)
    setCustomDays('')
  }

  const existingOffsets = new Set((rules as any[]).map((r: any) => r.daysOffset))

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5 text-gray-700" />
          Reminder Schedule
        </CardTitle>
        <CardDescription>
          Configure when reminders fire automatically. The tone escalates based on how close
          to (or past) the due date each reminder is sent.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Existing rules */}
        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-12 animate-pulse rounded-lg bg-gray-100" />
            ))}
          </div>
        ) : (rules as any[]).length === 0 ? (
          <div className="rounded-lg border-2 border-dashed border-gray-200 py-6 text-center">
            <Bell className="mx-auto h-8 w-8 text-gray-300 mb-2" />
            <p className="text-sm text-gray-500">No reminder rules configured.</p>
            <p className="text-xs text-gray-400 mt-1">
              Members will not receive automated reminders until you add at least one rule.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {(rules as any[]).map((rule: any) => {
              const tone = getToneLabel(rule.daysOffset)
              return (
                <div
                  key={rule.id}
                  className="flex items-center justify-between rounded-lg border px-4 py-3 bg-white"
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={cn(
                        'rounded-full border px-2 py-0.5 text-xs font-medium',
                        tone.color,
                      )}
                    >
                      {tone.label}
                    </span>
                    <span className="text-sm font-medium text-gray-900">
                      {formatDaysOffset(rule.daysOffset)}
                    </span>
                    <div className="flex gap-1">
                      {rule.channels.map((ch: string) => (
                        <span
                          key={ch}
                          className="rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-600"
                        >
                          {ch}
                        </span>
                      ))}
                    </div>
                  </div>
                  <button
                    onClick={() => deleteMutation.mutate(rule.id)}
                    disabled={deleteMutation.isPending}
                    className="rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-500 transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              )
            })}
          </div>
        )}

        {/* Add new rule */}
        <div className="rounded-lg border bg-gray-50 p-4 space-y-3">
          <p className="text-sm font-medium text-gray-700">Add trigger day</p>

          {/* Preset selector */}
          <div className="flex flex-wrap gap-2">
            {TRIGGER_PRESETS.filter((p) => !existingOffsets.has(p.daysOffset)).map((preset) => (
              <button
                key={preset.daysOffset}
                onClick={() => { setNewDaysOffset(preset.daysOffset); setShowCustom(false) }}
                className={cn(
                  'rounded-md border px-3 py-1.5 text-xs font-medium transition-colors',
                  !showCustom && newDaysOffset === preset.daysOffset
                    ? 'border-gray-900 bg-gray-900 text-white'
                    : 'border-gray-200 bg-white text-gray-700 hover:border-gray-400',
                )}
              >
                {preset.label}
              </button>
            ))}
            <button
              onClick={() => setShowCustom(true)}
              className={cn(
                'rounded-md border px-3 py-1.5 text-xs font-medium transition-colors',
                showCustom
                  ? 'border-gray-900 bg-gray-900 text-white'
                  : 'border-gray-200 bg-white text-gray-700 hover:border-gray-400',
              )}
            >
              Custom…
            </button>
          </div>

          {showCustom && (
            <div className="flex items-center gap-2 text-sm">
              <input
                type="number"
                placeholder="e.g. -10 or 21"
                value={customDays}
                onChange={(e) => setCustomDays(e.target.value)}
                className="w-28 rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-gray-400"
              />
              <span className="text-gray-500">
                days (negative = before due, 0 = due date, positive = after)
              </span>
            </div>
          )}

          {/* Channel picker */}
          <div>
            <p className="text-xs text-gray-500 mb-1.5">Send via</p>
            <div className="flex gap-2">
              {CHANNELS.map(({ value, label, icon: Icon }) => (
                <button
                  key={value}
                  onClick={() => toggleChannel(value)}
                  className={cn(
                    'flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium transition-colors',
                    newChannels.includes(value)
                      ? 'border-green-600 bg-green-50 text-green-700'
                      : 'border-gray-200 text-gray-600 hover:border-gray-300',
                  )}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {label}
                </button>
              ))}
            </div>
          </div>

          <Button
            size="sm"
            onClick={handleAdd}
            disabled={createMutation.isPending || newChannels.length === 0}
            isLoading={createMutation.isPending}
          >
            <PlusCircle className="h-4 w-4" />
            Add Rule
          </Button>
        </div>

        <p className="text-xs text-gray-400">
          The tone engine automatically adjusts the message — Friendly before due, Clear on the day,
          Firm at 1–4 days overdue, Formal at 5+ days overdue.
        </p>
      </CardContent>
    </Card>
  )
}

export function RemindersPage() {
  const { networkId } = useNetwork()
  const { track } = useAnalytics()
  const [selectedChannels, setSelectedChannels] = useState<string[]>(['EMAIL'])
  const [message, setMessage] = useState('')
  const queryClient = useQueryClient()

  const { data: historyData, isLoading: historyLoading } = useQuery({
    queryKey: ['reminders', 'history', networkId],
    queryFn: () => remindersApi.getHistory(networkId!),
    enabled: !!networkId,
  })

  const { data: estimate } = useQuery({
    queryKey: ['reminders', 'estimate', networkId, selectedChannels],
    queryFn: () => remindersApi.blastEstimate(networkId!, selectedChannels),
    enabled: !!networkId && selectedChannels.length > 0,
  })

  const blastMutation = useMutation({
    mutationFn: () =>
      remindersApi.blast(networkId!, {
        channels: selectedChannels,
        message: message || undefined,
      }),
    onSuccess: (res) => {
      if (res?.reason) {
        toast.warning(res.reason)
      } else {
        track('reminder_blast_sent', { channels: selectedChannels, sent: res?.sent ?? 0, failed: res?.failed ?? 0, hasCustomMessage: !!message })
        toast.success(
          `Sent ${res?.sent ?? 0} reminders${res?.failed > 0 ? `, ${res.failed} failed` : ''}`,
        )
        queryClient.invalidateQueries({ queryKey: ['reminders', 'history', networkId] })
      }
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || 'Failed to send'),
  })

  const toggleChannel = (channel: string) => {
    setSelectedChannels((prev) =>
      prev.includes(channel) ? prev.filter((c) => c !== channel) : [...prev, channel],
    )
  }

  const LOW_CREDITS_THRESHOLD = 20
  const isLowCreditsAfterBlast =
    estimate?.canAfford &&
    estimate.creditsRequired > 0 &&
    (estimate.creditsAfter ?? Infinity) < LOW_CREDITS_THRESHOLD

  const canSend = selectedChannels.length > 0 && (estimate ? estimate.canAfford : true)

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title="Reminders"
        description="Configure automated reminders and send manual blasts"
      />

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Left column: schedule + blast */}
        <div className="space-y-6">
          {networkId && <RuleSchedule networkId={networkId} />}

          {/* Manual blast */}
          <Card>
            <CardHeader>
              <CardTitle>Manual Blast</CardTitle>
              <CardDescription>
                Send an immediate reminder to all members with unpaid charges, regardless of schedule.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm font-medium text-gray-700 mb-2">Channels</p>
                <div className="flex gap-2">
                  {CHANNELS.map(({ value, label, icon: Icon }) => (
                    <button
                      key={value}
                      onClick={() => toggleChannel(value)}
                      className={cn(
                        'flex items-center gap-2 rounded-md border px-3 py-2 text-sm font-medium transition-colors',
                        selectedChannels.includes(value)
                          ? 'border-green-600 bg-green-50 text-green-700'
                          : 'border-gray-200 text-gray-600 hover:border-gray-300',
                      )}
                    >
                      <Icon className="h-4 w-4" />
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {estimate && (
                <div className="space-y-2">
                  <div
                    className={cn(
                      'rounded-md border px-3 py-2.5 text-sm flex items-start gap-2',
                      estimate.canAfford
                        ? 'border-blue-200 bg-blue-50 text-blue-800'
                        : 'border-red-200 bg-red-50 text-red-800',
                    )}
                  >
                    {estimate.canAfford ? (
                      <Info className="h-4 w-4 mt-0.5 shrink-0" />
                    ) : (
                      <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                    )}
                    <span>
                      {estimate.recipientCount} recipient
                      {estimate.recipientCount !== 1 ? 's' : ''}.
                      {estimate.creditsRequired > 0 && (
                        <>
                          {' '}Uses{' '}
                          <strong>{estimate.creditsRequired} SMS credits</strong>{' '}
                          ({estimate.creditsAvailable} available).
                        </>
                      )}
                      {!estimate.canAfford && (
                        <>
                          {' '}
                          <a href="/settings" className="underline font-medium">
                            Purchase more credits
                          </a>{' '}
                          to send SMS.
                        </>
                      )}
                    </span>
                  </div>
                  {isLowCreditsAfterBlast && (
                    <div className="rounded-md border border-yellow-300 bg-yellow-50 px-3 py-2.5 text-sm flex items-start gap-2 text-yellow-800">
                      <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                      <span>
                        This blast will leave you with only{' '}
                        <strong>{estimate.creditsAfter} SMS credits</strong>.{' '}
                        <a href="/settings" className="underline font-medium">
                          Top up in Settings
                        </a>{' '}
                        to avoid running out.
                      </span>
                    </div>
                  )}
                </div>
              )}

              <div>
                <p className="text-sm font-medium text-gray-700 mb-2">
                  Custom Message (optional)
                </p>
                <Textarea
                  placeholder="Leave blank to use the default reminder message…"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={3}
                />
              </div>

              <Button
                className="w-full"
                onClick={() => blastMutation.mutate()}
                isLoading={blastMutation.isPending}
                disabled={!canSend || blastMutation.isPending}
              >
                <Send className="h-4 w-4" />
                Send to All Non-Payers Now
              </Button>
              <p className="text-xs text-gray-400 text-center">
                Reminders will be sent to members with pending or overdue charges
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Right column: history */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Reminder History</CardTitle>
            <CardDescription>Last 100 reminders sent (manual blasts)</CardDescription>
          </CardHeader>
          <CardContent>
            {historyLoading ? (
              <p className="text-sm text-gray-500">Loading…</p>
            ) : !historyData?.length ? (
              <p className="text-sm text-gray-500">No reminders sent yet</p>
            ) : (
              <div className="space-y-2">
                {(historyData as any[]).slice(0, 20).map((r: any) => (
                  <div
                    key={r.id}
                    className="flex items-center justify-between py-2 border-b last:border-0"
                  >
                    <div>
                      <p className="text-sm font-medium">
                        {r.member?.firstName} {r.member?.lastName}
                      </p>
                      <p className="text-xs text-gray-500">
                        {r.channel} — {formatDate(r.createdAt)}
                      </p>
                    </div>
                    <StatusBadge status={r.status} />
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
