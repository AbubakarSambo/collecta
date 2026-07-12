import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { UserPlus, Upload, Link, Search, CheckCircle, AlertCircle, Loader2, BellOff } from 'lucide-react'
import { membersApi } from '@/api/members'
import { useNetwork } from '@/hooks/useNetwork'
import { useDebounce } from '@/hooks/useDebounce'
import { useAnalytics } from '@/hooks/useAnalytics'
import { PageHeader } from '@/components/shared/PageHeader'
import { DataTable, Column } from '@/components/shared/DataTable'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { Label } from '@/components/ui/Label'
import { Textarea } from '@/components/ui/Textarea'
import { StatusBadge } from '@/components/ui/Badge'
import { formatDate } from '@/lib/utils'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import type { Member } from '@/types'

const memberSchema = z.object({
  firstName: z.string().min(1, 'Required'),
  lastName: z.string().min(1, 'Required'),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  phone: z.string().optional(),
  unit: z.string().optional(),
  memberCode: z.string().optional(),
  whatsappOptedIn: z.boolean().optional(),
})

type MemberForm = z.infer<typeof memberSchema>

export function MembersPage() {
  const navigate = useNavigate()
  const { networkId } = useNetwork()
  const queryClient = useQueryClient()
  const { track } = useAnalytics()

  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [ghostOnly, setGhostOnly] = useState(false)
  const [addOpen, setAddOpen] = useState(false)
  const [importOpen, setImportOpen] = useState(false)
  const [csvData, setCsvData] = useState('')
  const [importJobId, setImportJobId] = useState<string | null>(null)

  const debouncedSearch = useDebounce(search, 300)

  const { data, isLoading } = useQuery({
    queryKey: ['members', networkId, page, debouncedSearch, ghostOnly],
    queryFn: () => membersApi.list(networkId!, { page, search: debouncedSearch, ghost: ghostOnly || undefined }),
    enabled: !!networkId,
    select: (r) => r.data,
  })

  const createMutation = useMutation({
    mutationFn: (data: MemberForm) => membersApi.create(networkId!, data),
    onSuccess: (_, variables) => {
      track('member_created', { hasEmail: !!variables.email, hasPhone: !!variables.phone, hasUnit: !!variables.unit })
      toast.success('Member added')
      queryClient.invalidateQueries({ queryKey: ['members', networkId] })
      setAddOpen(false)
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || 'Failed to add member'),
  })

  const { data: importJob } = useQuery({
    queryKey: ['importJob', networkId, importJobId],
    queryFn: () => membersApi.getImportJobStatus(networkId!, importJobId!),
    enabled: !!networkId && !!importJobId,
    refetchInterval: (query) => {
      const status = query.state.data?.status
      return status === 'DONE' || status === 'FAILED' ? false : 3000
    },
  })

  useEffect(() => {
    if (!importJob) return
    if (importJob.status === 'DONE') {
      track('member_csv_import_completed', { created: importJob.createdCount, skipped: importJob.skippedCount })
      toast.success(`Import complete: ${importJob.createdCount} added, ${importJob.skippedCount} skipped`)
      queryClient.invalidateQueries({ queryKey: ['members', networkId] })
      setImportJobId(null)
      setImportOpen(false)
      setCsvData('')
    } else if (importJob.status === 'FAILED') {
      toast.error('Import failed — check errors below')
    }
  }, [importJob?.status])

  const importMutation = useMutation({
    mutationFn: () => membersApi.importCsv(networkId!, csvData),
    onSuccess: (res: any) => {
      track('member_csv_import_started')
      setImportJobId(res.jobId ?? res.data?.jobId)
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || 'Import failed'),
  })

  const { register, handleSubmit, formState: { errors }, reset } = useForm<MemberForm>({
    resolver: zodResolver(memberSchema),
  })

  const onSubmit = (data: MemberForm) => {
    const payload = Object.fromEntries(
      Object.entries(data).filter(([, v]) => v !== '' && v !== undefined)
    ) as MemberForm
    createMutation.mutate(payload)
    reset()
  }

  const columns: Column<Member>[] = [
    {
      key: 'name',
      header: 'Member',
      render: (row) => (
        <div>
          <p className="font-medium text-gray-900">{row.firstName} {row.lastName}</p>
          <p className="text-xs text-gray-500">{row.unit || row.memberCode || row.email}</p>
        </div>
      ),
    },
    {
      key: 'email',
      header: 'Email',
      render: (row) => <span className="text-sm text-gray-600">{row.email || '—'}</span>,
    },
    {
      key: 'phone',
      header: 'Phone',
      render: (row) => (
        <div className="flex items-center gap-1.5">
          <span className="text-sm text-gray-600">{row.phone || '—'}</span>
          {row.smsOptedOut && (
            <span title="SMS opted out" className="inline-flex items-center gap-0.5 rounded-full bg-gray-100 px-1.5 py-0.5 text-xs text-gray-500">
              <BellOff className="h-3 w-3" />
              SMS off
            </span>
          )}
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => <StatusBadge status={row.status} />,
    },
    {
      key: 'joinedAt',
      header: 'Joined',
      render: (row) => <span className="text-sm text-gray-500">{formatDate(row.joinedAt)}</span>,
    },
    {
      key: 'actions',
      header: '',
      render: (row) => (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate(`/members/${row.id}`)}
        >
          View
        </Button>
      ),
    },
  ]

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title="Members"
        description="Manage your network members"
        action={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setImportOpen(true)}>
              <Upload className="h-4 w-4" />
              Import CSV
            </Button>
            <Button size="sm" onClick={() => setAddOpen(true)}>
              <UserPlus className="h-4 w-4" />
              Add Member
            </Button>
          </div>
        }
      />

      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search by name, email, unit..."
            className="pl-9"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1) }}
          />
        </div>
        <button
          onClick={() => { setGhostOnly((g) => !g); setPage(1) }}
          className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
            ghostOnly
              ? 'border-gray-700 bg-gray-800 text-white'
              : 'border-gray-200 bg-white text-gray-600 hover:border-gray-400'
          }`}
          title="Members assigned fees but never paid — joined 90+ days ago"
        >
          <BellOff className="h-3.5 w-3.5" />
          Ghost members
        </button>
      </div>

      <div className="rounded-lg border bg-white">
        <DataTable
          columns={columns}
          data={(data?.data || []) as unknown as Member[]}
          isLoading={isLoading}
          pagination={{
            page,
            totalPages: data?.meta?.totalPages || 1,
            onPageChange: setPage,
          }}
          emptyMessage="No members yet. Add your first member to get started."
          keyExtractor={(r) => (r as any).id}
        />
      </div>

      {/* Add Member Modal */}
      <Modal isOpen={addOpen} onClose={() => setAddOpen(false)} title="Add Member">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>First Name</Label>
              <Input placeholder="Chidi" error={errors.firstName?.message} {...register('firstName')} />
            </div>
            <div>
              <Label>Last Name</Label>
              <Input placeholder="Eze" error={errors.lastName?.message} {...register('lastName')} />
            </div>
          </div>
          <div>
            <Label>Email (optional)</Label>
            <Input type="email" placeholder="chidi@example.com" {...register('email')} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Phone (optional)</Label>
              <Input placeholder="+2348012345678" {...register('phone')} />
            </div>
            <div>
              <Label>Unit (optional)</Label>
              <Input placeholder="Unit 12B" {...register('unit')} />
            </div>
          </div>
          <div>
            <Label>Member Code (optional)</Label>
            <Input placeholder="MBR-001" {...register('memberCode')} />
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" className="rounded" {...register('whatsappOptedIn')} />
            <span className="text-sm font-medium text-gray-700">Member has consented to WhatsApp reminders</span>
          </label>
          <div className="flex gap-2 pt-2">
            <Button type="button" variant="outline" className="flex-1" onClick={() => setAddOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" className="flex-1" isLoading={createMutation.isPending}>
              Add Member
            </Button>
          </div>
        </form>
      </Modal>

      {/* Import CSV Modal */}
      <Modal isOpen={importOpen} onClose={() => { if (!importJobId) { setImportOpen(false); setCsvData('') } }} title="Import Members from CSV" size="lg">
        <div className="space-y-3">
          {importJobId && importJob ? (
            <div className="space-y-4">
              {importJob.status === 'PROCESSING' || importJob.status === 'QUEUED' ? (
                <div className="flex flex-col items-center gap-3 py-6">
                  <Loader2 className="h-8 w-8 animate-spin text-brand-600" />
                  <p className="text-sm font-medium text-gray-700">
                    {importJob.status === 'QUEUED' ? 'Queued — processing will start shortly…' : `Processing row ${importJob.processedRows} of ${importJob.totalRows}…`}
                  </p>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-green-500 h-2 rounded-full transition-all"
                      style={{ width: `${importJob.totalRows > 0 ? Math.round((importJob.processedRows / importJob.totalRows) * 100) : 0}%` }}
                    />
                  </div>
                </div>
              ) : importJob.status === 'DONE' ? (
                <div className="flex flex-col items-center gap-2 py-6">
                  <CheckCircle className="h-8 w-8 text-green-600" />
                  <p className="text-sm font-medium text-gray-700">{importJob.createdCount} members added, {importJob.skippedCount} skipped</p>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2 py-4">
                  <AlertCircle className="h-8 w-8 text-red-500" />
                  <p className="text-sm font-medium text-red-700">Import failed</p>
                </div>
              )}
              {Array.isArray(importJob.errors) && importJob.errors.length > 0 && (
                <div className="rounded-md bg-red-50 border border-red-200 p-3 max-h-40 overflow-y-auto">
                  <p className="text-xs font-semibold text-red-700 mb-1">Errors:</p>
                  {(importJob.errors as string[]).map((e, i) => (
                    <p key={i} className="text-xs text-red-600">{e}</p>
                  ))}
                </div>
              )}
              {(importJob.status === 'DONE' || importJob.status === 'FAILED') && (
                <Button className="w-full" onClick={() => { setImportJobId(null); setImportOpen(false); setCsvData('') }}>
                  Close
                </Button>
              )}
            </div>
          ) : (
            <>
              <p className="text-sm text-gray-600">
                Paste CSV data below. Required columns: <code>firstName</code>, <code>lastName</code>. Optional: <code>email</code>, <code>phone</code>, <code>unit</code>, <code>memberCode</code>, <code>whatsappOptIn</code> (yes/no — only mark yes if the member actually consented).
              </p>
              <div className="rounded-md bg-gray-50 p-3">
                <code className="text-xs text-gray-600">
                  firstName,lastName,email,phone,unit,memberCode,whatsappOptIn
                  <br />
                  Chidi,Eze,chidi@example.com,+234800000000,Unit 1A,MBR-001,yes
                </code>
              </div>
              <Textarea
                placeholder="Paste CSV data here..."
                rows={8}
                value={csvData}
                onChange={(e) => setCsvData(e.target.value)}
              />
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => { setImportOpen(false); setCsvData('') }}>
                  Cancel
                </Button>
                <Button
                  className="flex-1"
                  isLoading={importMutation.isPending}
                  onClick={() => importMutation.mutate()}
                >
                  Import
                </Button>
              </div>
            </>
          )}
        </div>
      </Modal>
    </div>
  )
}
