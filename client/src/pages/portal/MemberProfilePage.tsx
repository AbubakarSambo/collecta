import { useParams, Link, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { CheckCircle, AlertTriangle, LogOut } from 'lucide-react'
import { portalApi } from '@/api/portal'
import { getMemberSession, clearMemberSession } from '@/hooks/useMemberSession'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { StatusBadge } from '@/components/ui/Badge'
import { formatCurrency, formatDate } from '@/lib/utils'
import { FullPageSpinner } from '@/components/ui/Spinner'
import { Button } from '@/components/ui/Button'

export function MemberProfilePage() {
  const { slug, memberId } = useParams<{ slug: string; memberId: string }>()
  const navigate = useNavigate()
  const session = slug ? getMemberSession(slug) : null
  const isOwnProfile = session?.id === memberId

  const handleLogout = () => {
    if (slug) clearMemberSession(slug)
    navigate(`/n/${slug}`)
  }

  const { data, isLoading } = useQuery({
    queryKey: ['portal', slug, 'member', memberId],
    queryFn: () => portalApi.getMemberProfile(slug!, memberId!),
    enabled: !!slug && !!memberId,
    select: (r) => r.data,
  })

  if (isLoading) return <FullPageSpinner />

  if (!data) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Member not found</p>
      </div>
    )
  }

  const { member, charges, summary, motivationalMessage } = data

  const isGoodStanding = summary.chargesOverdue === 0

  return (
    <div className="space-y-6">
      {isOwnProfile && (
        <div className="flex items-center justify-between rounded-lg bg-green-50 border border-green-200 px-4 py-2">
          <p className="text-sm text-green-800">
            Signed in as <strong>{session!.firstName} {session!.lastName}</strong>
          </p>
          <button
            onClick={handleLogout}
            className="flex items-center gap-1 text-sm text-green-700 hover:text-green-900"
          >
            <LogOut className="h-4 w-4" /> Sign out
          </button>
        </div>
      )}

      <div className="text-center">
        <div className={`mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full ${isGoodStanding ? 'bg-green-100' : 'bg-red-100'}`}>
          {isGoodStanding ? (
            <CheckCircle className="h-8 w-8 text-green-600" />
          ) : (
            <AlertTriangle className="h-8 w-8 text-red-500" />
          )}
        </div>
        <h2 className="text-2xl font-bold text-gray-900">
          {member.firstName} {member.lastName}
        </h2>
        {member.unit && <p className="text-gray-500">{member.unit}</p>}
        <p className={`mt-2 text-sm font-medium ${isGoodStanding ? 'text-green-700' : 'text-red-600'}`}>
          {motivationalMessage}
        </p>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Card>
          <CardContent className="p-3 text-center">
            <p className="text-2xl font-bold">{summary.compliancePercent}%</p>
            <p className="text-xs text-gray-500">Compliance</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <p className="text-2xl font-bold text-green-600">{summary.chargesPaid}</p>
            <p className="text-xs text-gray-500">Paid</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <p className="text-2xl font-bold text-yellow-600">{summary.chargesPending}</p>
            <p className="text-xs text-gray-500">Pending</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <p className="text-2xl font-bold text-red-600">{summary.chargesOverdue}</p>
            <p className="text-xs text-gray-500">Overdue</p>
          </CardContent>
        </Card>
      </div>

      {/* Charges */}
      <Card>
        <CardHeader>
          <CardTitle>My Charges</CardTitle>
        </CardHeader>
        <CardContent>
          {charges.length === 0 ? (
            <p className="text-sm text-gray-500">No charges assigned yet</p>
          ) : (
            <div className="space-y-3">
              {charges.map((c: any) => (
                <div key={c.id} className="flex items-center justify-between rounded-lg border p-3">
                  <div>
                    <p className="font-medium text-gray-900">{c.fee?.name || c.description || 'Charge'}</p>
                    <p className="text-xs text-gray-500">Due {formatDate(c.dueDate)}</p>
                  </div>
                  <div className="text-right flex flex-col items-end gap-1">
                    <p className="font-bold">{formatCurrency(Number(c.amount))}</p>
                    <StatusBadge status={c.status} />
                    {(c.status === 'PENDING' || c.status === 'OVERDUE' || c.status === 'PARTIALLY_PAID') && (
                      <Link to={`/n/${slug}/pay/${c.id}`}>
                        <Button size="sm" variant="outline" className="mt-1">
                          Pay Now
                        </Button>
                      </Link>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
