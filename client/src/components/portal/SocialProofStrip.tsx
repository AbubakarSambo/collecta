import type { NetworkStats } from './types'

interface SocialProofStripProps {
  stats?: NetworkStats | null
}

/** "X of Y members are fully paid up" strip with a live pulse dot. */
export function SocialProofStrip({ stats }: SocialProofStripProps) {
  if (!stats || stats.totalMembers <= 0) return null
  return (
    <div className="flex items-center gap-3 rounded-lg border bg-white px-4 py-3">
      <span className="relative flex h-2.5 w-2.5 shrink-0">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
        <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-green-500" />
      </span>
      <p className="text-sm text-gray-600">
        <strong className="text-gray-900">
          {stats.membersCurrentWithPayments} of {stats.totalMembers} members
        </strong>{' '}
        are fully paid up
      </p>
    </div>
  )
}
