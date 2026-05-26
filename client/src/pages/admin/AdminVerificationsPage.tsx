import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { ShieldCheck, ShieldX, Building2, Mail, Hash, MapPin, FileText, Clock } from 'lucide-react'
import { adminApi } from '@/api/admin'
import { PageHeader } from '@/components/shared/PageHeader'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { Textarea } from '@/components/ui/Textarea'
import { FullPageSpinner } from '@/components/ui/Spinner'
import { formatDate } from '@/lib/utils'

function RejectModal({
  open,
  onClose,
  onConfirm,
  isPending,
  networkName,
}: {
  open: boolean
  onClose: () => void
  onConfirm: (reason: string) => void
  isPending: boolean
  networkName: string
}) {
  const [reason, setReason] = useState('')

  const handleConfirm = () => {
    if (!reason.trim()) return
    onConfirm(reason.trim())
  }

  return (
    <Modal isOpen={open} onClose={onClose} title={`Reject — ${networkName}`}>
      <div className="space-y-4">
        <p className="text-sm text-gray-600">
          Provide a specific rejection reason. This will be shown to the admin.
        </p>
        <Textarea
          placeholder="e.g. CAC number could not be verified. Please resubmit with a valid registration number."
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={4}
        />
        <div className="flex gap-2">
          <Button
            className="flex-1 bg-red-600 hover:bg-red-700 text-white"
            onClick={handleConfirm}
            disabled={!reason.trim() || isPending}
            isLoading={isPending}
          >
            Confirm Rejection
          </Button>
          <Button variant="outline" onClick={onClose} disabled={isPending}>
            Cancel
          </Button>
        </div>
      </div>
    </Modal>
  )
}

function VerificationCard({
  v,
  onApprove,
  onReject,
  approving,
}: {
  v: any
  onApprove: () => void
  onReject: () => void
  approving: boolean
}) {
  return (
    <div className="rounded-lg border bg-white p-6 space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-base font-semibold text-gray-900">{v.organisationName}</h3>
          <div className="flex items-center gap-1.5 mt-1">
            <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-700">
              {v.network?.networkType}
            </span>
            <span className="inline-flex items-center rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-700">
              Pending
            </span>
          </div>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-gray-400">
          <Clock className="h-3.5 w-3.5" />
          {formatDate(v.createdAt)}
        </div>
      </div>

      {/* Details grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="flex items-start gap-2 text-sm">
          <Building2 className="h-4 w-4 text-gray-400 mt-0.5 shrink-0" />
          <div>
            <p className="text-xs text-gray-500 mb-0.5">Network slug</p>
            <p className="font-mono text-gray-700">{v.network?.slug}</p>
          </div>
        </div>
        <div className="flex items-start gap-2 text-sm">
          <Mail className="h-4 w-4 text-gray-400 mt-0.5 shrink-0" />
          <div>
            <p className="text-xs text-gray-500 mb-0.5">Admin</p>
            <p className="text-gray-700">{v.network?.admin?.firstName} {v.network?.admin?.lastName}</p>
            <p className="text-gray-500 text-xs">{v.network?.admin?.email}</p>
          </div>
        </div>
        {v.cacNumber && (
          <div className="flex items-start gap-2 text-sm">
            <FileText className="h-4 w-4 text-gray-400 mt-0.5 shrink-0" />
            <div>
              <p className="text-xs text-gray-500 mb-0.5">CAC Number</p>
              <p className="font-mono text-gray-700">{v.cacNumber}</p>
            </div>
          </div>
        )}
        {(v.bvn || v.nin) && (
          <div className="flex items-start gap-2 text-sm">
            <Hash className="h-4 w-4 text-gray-400 mt-0.5 shrink-0" />
            <div>
              <p className="text-xs text-gray-500 mb-0.5">{v.bvn ? 'BVN' : 'NIN'}</p>
              <p className="font-mono text-gray-700">{v.bvn || v.nin}</p>
            </div>
          </div>
        )}
        {v.contactAddress && (
          <div className="flex items-start gap-2 text-sm sm:col-span-2">
            <MapPin className="h-4 w-4 text-gray-400 mt-0.5 shrink-0" />
            <div>
              <p className="text-xs text-gray-500 mb-0.5">Contact Address</p>
              <p className="text-gray-700">{v.contactAddress}</p>
            </div>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-2 pt-2 border-t">
        <Button
          size="sm"
          onClick={onApprove}
          disabled={approving}
          isLoading={approving}
          className="bg-green-600 hover:bg-green-700 text-white"
        >
          <ShieldCheck className="h-4 w-4" />
          Approve
        </Button>
        <Button size="sm" variant="outline" onClick={onReject} disabled={approving}>
          <ShieldX className="h-4 w-4" />
          Reject
        </Button>
      </div>
    </div>
  )
}

export function AdminVerificationsPage() {
  const queryClient = useQueryClient()
  const [rejectTarget, setRejectTarget] = useState<{ id: string; name: string; networkId: string } | null>(null)

  const { data: verifications, isLoading } = useQuery({
    queryKey: ['admin', 'verifications'],
    queryFn: () => adminApi.getPendingVerifications(),
    select: (r) => r.data?.data,
  })

  const approveMutation = useMutation({
    mutationFn: (networkId: string) => adminApi.approveVerification(networkId),
    onSuccess: () => {
      toast.success('Network approved — portal is now live')
      queryClient.invalidateQueries({ queryKey: ['admin'] })
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || 'Approval failed'),
  })

  const rejectMutation = useMutation({
    mutationFn: ({ networkId, reason }: { networkId: string; reason: string }) =>
      adminApi.rejectVerification(networkId, reason),
    onSuccess: () => {
      toast.success('Network rejected')
      setRejectTarget(null)
      queryClient.invalidateQueries({ queryKey: ['admin'] })
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || 'Rejection failed'),
  })

  if (isLoading) return <FullPageSpinner />

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title="Verification Queue"
        description={
          verifications?.length
            ? `${verifications.length} organisation${verifications.length !== 1 ? 's' : ''} awaiting review`
            : 'No pending verifications'
        }
      />

      {!verifications?.length ? (
        <div className="rounded-lg border bg-white p-12 text-center">
          <ShieldCheck className="mx-auto h-10 w-10 text-green-500 mb-3" />
          <p className="text-gray-900 font-medium">All clear</p>
          <p className="text-sm text-gray-500 mt-1">No organisations are waiting for review.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {verifications.map((v: any) => (
            <VerificationCard
              key={v.id}
              v={v}
              approving={approveMutation.isPending && approveMutation.variables === v.network?.id}
              onApprove={() => approveMutation.mutate(v.network?.id)}
              onReject={() => setRejectTarget({ id: v.id, name: v.organisationName, networkId: v.network?.id })}
            />
          ))}
        </div>
      )}

      {rejectTarget && (
        <RejectModal
          open
          onClose={() => setRejectTarget(null)}
          networkName={rejectTarget.name}
          isPending={rejectMutation.isPending}
          onConfirm={(reason) => rejectMutation.mutate({ networkId: rejectTarget.networkId, reason })}
        />
      )}
    </div>
  )
}
