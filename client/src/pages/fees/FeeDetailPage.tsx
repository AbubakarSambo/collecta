import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { ArrowLeft, UserPlus } from 'lucide-react'
import { feesApi } from '@/api/fees'
import { membersApi } from '@/api/members'
import { useNetwork } from '@/hooks/useNetwork'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Modal } from '@/components/ui/Modal'
import { formatCurrency, formatDate } from '@/lib/utils'
import { FullPageSpinner } from '@/components/ui/Spinner'
import { useState } from 'react'

export function FeeDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { networkId } = useNetwork()
  const queryClient = useQueryClient()
  const [assignOpen, setAssignOpen] = useState(false)
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([])

  const { data: feeData, isLoading } = useQuery({
    queryKey: ['fee', networkId, id],
    queryFn: () => feesApi.getById(networkId!, id!),
    enabled: !!networkId && !!id,
    select: (r) => r.data,
  })

  const { data: membersData } = useQuery({
    queryKey: ['members', networkId, 'all'],
    queryFn: () => membersApi.list(networkId!, { limit: 200 }),
    enabled: !!networkId && assignOpen,
    select: (r) => r.data?.data || [],
  })

  const assignMutation = useMutation({
    mutationFn: () => feesApi.assignToMembers(networkId!, id!, { memberIds: selectedMemberIds }),
    onSuccess: (res) => {
      toast.success(`Assigned to ${res.data.assigned} members`)
      queryClient.invalidateQueries({ queryKey: ['fee', networkId, id] })
      setAssignOpen(false)
      setSelectedMemberIds([])
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || 'Failed'),
  })

  const removeMutation = useMutation({
    mutationFn: (memberId: string) => feesApi.removeAssignment(networkId!, id!, memberId),
    onSuccess: () => {
      toast.success('Assignment removed')
      queryClient.invalidateQueries({ queryKey: ['fee', networkId, id] })
    },
  })

  if (isLoading || !feeData) return <FullPageSpinner />

  const fee = feeData
  const assignments = fee.assignments || []
  const assignedMemberIds = assignments.map((a: any) => a.memberId)

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate('/fees')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">{fee.name}</h1>
          <div className="flex items-center gap-2 mt-1">
            <Badge variant={fee.type === 'ASSIGNED' ? 'info' : 'warning'}>{fee.type}</Badge>
            <span className="text-sm text-gray-500">{fee.frequency}</span>
          </div>
        </div>
        <div className="ml-auto">
          <Button onClick={() => setAssignOpen(true)}>
            <UserPlus className="h-4 w-4" />
            Assign Members
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-gray-500">Amount</p>
            <p className="text-2xl font-bold">{formatCurrency(Number(fee.amount))}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-gray-500">Assigned Members</p>
            <p className="text-2xl font-bold">{assignments.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-gray-500">Due Day</p>
            <p className="text-2xl font-bold">{fee.dueDay}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Assigned Members ({assignments.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {assignments.length === 0 ? (
            <p className="text-sm text-gray-500">No members assigned yet</p>
          ) : (
            <div className="space-y-2">
              {assignments.map((a: any) => (
                <div key={a.id} className="flex items-center justify-between py-2 border-b last:border-0">
                  <div>
                    <p className="text-sm font-medium">{a.member?.firstName} {a.member?.lastName}</p>
                    <p className="text-xs text-gray-500">{a.member?.unit || a.member?.email}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    {a.amount && (
                      <p className="text-sm font-medium">{formatCurrency(Number(a.amount))}</p>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-red-500 hover:text-red-700"
                      onClick={() => removeMutation.mutate(a.memberId)}
                    >
                      Remove
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Modal isOpen={assignOpen} onClose={() => setAssignOpen(false)} title="Assign Members" size="lg">
        <div className="space-y-3">
          <p className="text-sm text-gray-500">Select members to assign this fee to</p>
          <div className="max-h-60 overflow-y-auto space-y-1">
            {(membersData || []).filter((m: any) => !assignedMemberIds.includes(m.id)).map((m: any) => (
              <label key={m.id} className="flex items-center gap-3 rounded-md p-2 hover:bg-gray-50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedMemberIds.includes(m.id)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedMemberIds((prev) => [...prev, m.id])
                    } else {
                      setSelectedMemberIds((prev) => prev.filter((id) => id !== m.id))
                    }
                  }}
                />
                <div>
                  <p className="text-sm font-medium">{m.firstName} {m.lastName}</p>
                  <p className="text-xs text-gray-500">{m.unit || m.email}</p>
                </div>
              </label>
            ))}
          </div>
          <p className="text-xs text-gray-500">{selectedMemberIds.length} selected</p>
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={() => setAssignOpen(false)}>Cancel</Button>
            <Button
              className="flex-1"
              disabled={selectedMemberIds.length === 0}
              isLoading={assignMutation.isPending}
              onClick={() => assignMutation.mutate()}
            >
              Assign
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
