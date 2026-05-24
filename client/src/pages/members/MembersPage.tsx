import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { UserPlus, Upload, Link, Search } from 'lucide-react'
import { membersApi } from '@/api/members'
import { useNetwork } from '@/hooks/useNetwork'
import { useDebounce } from '@/hooks/useDebounce'
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
})

type MemberForm = z.infer<typeof memberSchema>

export function MembersPage() {
  const navigate = useNavigate()
  const { networkId } = useNetwork()
  const queryClient = useQueryClient()

  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [addOpen, setAddOpen] = useState(false)
  const [importOpen, setImportOpen] = useState(false)
  const [csvData, setCsvData] = useState('')

  const debouncedSearch = useDebounce(search, 300)

  const { data, isLoading } = useQuery({
    queryKey: ['members', networkId, page, debouncedSearch],
    queryFn: () => membersApi.list(networkId!, { page, search: debouncedSearch }),
    enabled: !!networkId,
    select: (r) => r.data,
  })

  const createMutation = useMutation({
    mutationFn: (data: MemberForm) => membersApi.create(networkId!, data),
    onSuccess: () => {
      toast.success('Member added')
      queryClient.invalidateQueries({ queryKey: ['members', networkId] })
      setAddOpen(false)
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || 'Failed to add member'),
  })

  const importMutation = useMutation({
    mutationFn: () => membersApi.importCsv(networkId!, csvData),
    onSuccess: (res) => {
      toast.success(`Imported ${res.data.created} members, skipped ${res.data.skipped}`)
      queryClient.invalidateQueries({ queryKey: ['members', networkId] })
      setImportOpen(false)
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || 'Import failed'),
  })

  const { register, handleSubmit, formState: { errors }, reset } = useForm<MemberForm>({
    resolver: zodResolver(memberSchema),
  })

  const onSubmit = (data: MemberForm) => {
    createMutation.mutate(data)
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
      render: (row) => <span className="text-sm text-gray-600">{row.phone || '—'}</span>,
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

      <div className="relative">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
        <Input
          placeholder="Search by name, email, unit..."
          className="pl-9"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
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
          keyExtractor={(r) => r.id}
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
      <Modal isOpen={importOpen} onClose={() => setImportOpen(false)} title="Import Members from CSV" size="lg">
        <div className="space-y-3">
          <p className="text-sm text-gray-600">
            Paste CSV data below. Required columns: <code>firstName</code>, <code>lastName</code>. Optional: <code>email</code>, <code>phone</code>, <code>unit</code>, <code>memberCode</code>.
          </p>
          <div className="rounded-md bg-gray-50 p-3">
            <code className="text-xs text-gray-600">
              firstName,lastName,email,phone,unit,memberCode
              <br />
              Chidi,Eze,chidi@example.com,+234800000000,Unit 1A,MBR-001
            </code>
          </div>
          <Textarea
            placeholder="Paste CSV data here..."
            rows={8}
            value={csvData}
            onChange={(e) => setCsvData(e.target.value)}
          />
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={() => setImportOpen(false)}>
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
        </div>
      </Modal>
    </div>
  )
}
