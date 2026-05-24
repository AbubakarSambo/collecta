import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Send, Mail, MessageSquare, Phone } from 'lucide-react'
import { remindersApi } from '@/api/reminders'
import { useNetwork } from '@/hooks/useNetwork'
import { PageHeader } from '@/components/shared/PageHeader'
import { Button } from '@/components/ui/Button'
import { Textarea } from '@/components/ui/Textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { StatusBadge } from '@/components/ui/Badge'
import { formatDate } from '@/lib/utils'
import { cn } from '@/lib/utils'

const CHANNELS = [
  { value: 'EMAIL', label: 'Email', icon: Mail },
  { value: 'SMS', label: 'SMS', icon: Phone },
  { value: 'WHATSAPP', label: 'WhatsApp', icon: MessageSquare },
]

export function RemindersPage() {
  const { networkId } = useNetwork()
  const [selectedChannels, setSelectedChannels] = useState<string[]>(['EMAIL'])
  const [message, setMessage] = useState('')
  const queryClient = useQueryClient()

  const { data: historyData, isLoading } = useQuery({
    queryKey: ['reminders', 'history', networkId],
    queryFn: () => remindersApi.getHistory(networkId!),
    enabled: !!networkId,
    select: (r) => r.data,
  })

  const blastMutation = useMutation({
    mutationFn: () => remindersApi.blast(networkId!, { channels: selectedChannels, message: message || undefined }),
    onSuccess: (res) => {
      toast.success(`Sent ${res.data.sent} reminders, ${res.data.failed} failed`)
      queryClient.invalidateQueries({ queryKey: ['reminders', 'history', networkId] })
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || 'Failed to send'),
  })

  const toggleChannel = (channel: string) => {
    setSelectedChannels((prev) =>
      prev.includes(channel) ? prev.filter((c) => c !== channel) : [...prev, channel],
    )
  }

  return (
    <div className="p-6 space-y-6">
      <PageHeader title="Reminders" description="Send payment reminders to non-paying members" />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Send Blast Reminder</CardTitle>
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

            <div>
              <p className="text-sm font-medium text-gray-700 mb-2">Custom Message (optional)</p>
              <Textarea
                placeholder="Leave blank to use the default reminder message..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={4}
              />
            </div>

            <Button
              className="w-full"
              onClick={() => blastMutation.mutate()}
              isLoading={blastMutation.isPending}
              disabled={selectedChannels.length === 0}
            >
              <Send className="h-4 w-4" />
              Send to All Non-Payers
            </Button>

            <p className="text-xs text-gray-400 text-center">
              Reminders will be sent to members with pending or overdue charges
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Reminder History</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p className="text-sm text-gray-500">Loading...</p>
            ) : !historyData?.length ? (
              <p className="text-sm text-gray-500">No reminders sent yet</p>
            ) : (
              <div className="space-y-2">
                {historyData.slice(0, 20).map((r: any) => (
                  <div key={r.id} className="flex items-center justify-between py-2 border-b last:border-0">
                    <div>
                      <p className="text-sm font-medium">{r.member?.firstName} {r.member?.lastName}</p>
                      <p className="text-xs text-gray-500">{r.channel} — {formatDate(r.createdAt)}</p>
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
