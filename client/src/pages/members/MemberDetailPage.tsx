import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { ArrowLeft, Send, Link, Pencil, X, Check } from 'lucide-react'
import { membersApi } from '@/api/members'
import { remindersApi } from '@/api/reminders'
import { useNetwork } from '@/hooks/useNetwork'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { StatusBadge } from '@/components/ui/Badge'
import { formatCurrency, formatDate } from '@/lib/utils'
import { FullPageSpinner } from '@/components/ui/Spinner'

export function MemberDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { networkId } = useNetwork()
  const queryClient = useQueryClient()
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({ phone: '', email: '', unit: '', memberCode: '', firstName: '', lastName: '' })

  const { data, isLoading } = useQuery({
    queryKey: ['member', networkId, id],
    queryFn: () => membersApi.getById(networkId!, id!),
    enabled: !!networkId && !!id,
    select: (r) => r.data,
  })

  const updateMutation = useMutation({
    mutationFn: (payload: typeof form) => membersApi.update(networkId!, id!, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['member', networkId, id] })
      toast.success('Member updated')
      setEditing(false)
    },
    onError: () => toast.error('Failed to update member'),
  })

  const reminderMutation = useMutation({
    mutationFn: () =>
      remindersApi.sendToMember(networkId!, id!, { channels: ['EMAIL'] }),
    onSuccess: () => toast.success('Reminder sent'),
    onError: () => toast.error('Failed to send reminder'),
  })

  const inviteMutation = useMutation({
    mutationFn: () => membersApi.getInviteLink(networkId!, id!),
    onSuccess: (res) => {
      navigator.clipboard.writeText(res.data.inviteUrl)
      toast.success('Invite link copied to clipboard')
    },
  })

  if (isLoading || !data) return <FullPageSpinner />

  const member = data

  const startEditing = () => {
    setForm({
      phone: member.phone || '',
      email: member.email || '',
      unit: member.unit || '',
      memberCode: member.memberCode || '',
      firstName: member.firstName || '',
      lastName: member.lastName || '',
    })
    setEditing(true)
  }
  const charges = member.charges || []
  const payments = member.payments || []
  const paid = charges.filter((c: any) => c.status === 'PAID').length
  const compliance = charges.length > 0 ? Math.round((paid / charges.length) * 100) : 100

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate('/members')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {member.firstName} {member.lastName}
          </h1>
          <p className="text-sm text-gray-500">{member.unit || member.memberCode || 'No unit'}</p>
        </div>
        <div className="ml-auto flex gap-2">
          <Button variant="outline" size="sm" onClick={() => inviteMutation.mutate()}>
            <Link className="h-4 w-4" />
            Copy Invite Link
          </Button>
          <Button size="sm" onClick={() => reminderMutation.mutate()} isLoading={reminderMutation.isPending}>
            <Send className="h-4 w-4" />
            Send Reminder
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-gray-500">Total Charges</p>
            <p className="text-2xl font-bold">{charges.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-gray-500">Paid</p>
            <p className="text-2xl font-bold text-green-600">{paid}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-gray-500">Compliance</p>
            <p className="text-2xl font-bold">{compliance}%</p>
          </CardContent>
        </Card>
      </div>

      {/* Member Info */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Contact Info</CardTitle>
            {!editing ? (
              <Button variant="ghost" size="sm" onClick={startEditing}>
                <Pencil className="h-4 w-4" />
              </Button>
            ) : (
              <div className="flex gap-1">
                <Button variant="ghost" size="sm" onClick={() => setEditing(false)}>
                  <X className="h-4 w-4" />
                </Button>
                <Button size="sm" onClick={() => updateMutation.mutate(form)} isLoading={updateMutation.isPending}>
                  <Check className="h-4 w-4" />
                  Save
                </Button>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {editing ? (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs text-gray-500">First Name</label>
                <Input value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-gray-500">Last Name</label>
                <Input value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-gray-500">Email</label>
                <Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-gray-500">Phone</label>
                <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="2348XXXXXXXXXX" />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-gray-500">Unit</label>
                <Input value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-gray-500">Member Code</label>
                <Input value={form.memberCode} onChange={(e) => setForm({ ...form, memberCode: e.target.value })} />
              </div>
            </div>
          ) : (
            <dl className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <dt className="text-gray-500">Email</dt>
                <dd className="font-medium">{member.email || '—'}</dd>
              </div>
              <div>
                <dt className="text-gray-500">Phone</dt>
                <dd className="font-medium">{member.phone || '—'}</dd>
              </div>
              <div>
                <dt className="text-gray-500">Unit</dt>
                <dd className="font-medium">{member.unit || '—'}</dd>
              </div>
              <div>
                <dt className="text-gray-500">Member Code</dt>
                <dd className="font-medium">{member.memberCode || '—'}</dd>
              </div>
              <div>
                <dt className="text-gray-500">Status</dt>
                <dd><StatusBadge status={member.status} /></dd>
              </div>
              <div>
                <dt className="text-gray-500">Joined</dt>
                <dd className="font-medium">{formatDate(member.joinedAt)}</dd>
              </div>
            </dl>
          )}
        </CardContent>
      </Card>

      {/* Charges */}
      <Card>
        <CardHeader>
          <CardTitle>Charges ({charges.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {charges.length === 0 ? (
            <p className="text-sm text-gray-500">No charges yet</p>
          ) : (
            <div className="space-y-2">
              {charges.map((c: any) => (
                <div key={c.id} className="flex items-center justify-between py-2 border-b last:border-0">
                  <div>
                    <p className="text-sm font-medium">{c.fee?.name || c.description || 'Charge'}</p>
                    <p className="text-xs text-gray-500">Due {formatDate(c.dueDate)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold">{formatCurrency(Number(c.amount))}</p>
                    <StatusBadge status={c.status} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Payments */}
      <Card>
        <CardHeader>
          <CardTitle>Payment History</CardTitle>
        </CardHeader>
        <CardContent>
          {payments.length === 0 ? (
            <p className="text-sm text-gray-500">No payments recorded</p>
          ) : (
            <div className="space-y-2">
              {payments.map((p: any) => (
                <div key={p.id} className="flex items-center justify-between py-2 border-b last:border-0">
                  <div>
                    <p className="text-sm font-medium">{formatDate(p.createdAt)}</p>
                    <p className="text-xs text-gray-500">{p.method}</p>
                  </div>
                  <p className="text-sm font-semibold text-green-700">{formatCurrency(Number(p.amount))}</p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
