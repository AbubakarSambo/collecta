import { Link } from 'react-router-dom'
import { Users } from 'lucide-react'
import { Button } from '@/components/ui/Button'

interface CollectorNudgeProps {
  slug: string
  /** Optional context line, e.g. how many organisations the member pays. */
  body?: string
}

/** "Do you collect from a group?" payer → collector conversion block. */
export function CollectorNudge({ slug, body }: CollectorNudgeProps) {
  return (
    <div className="rounded-lg border bg-gray-50 p-5">
      <div className="mb-2 flex items-center gap-2">
        <Users className="h-4 w-4 text-gray-500" />
        <h3 className="text-sm font-semibold text-gray-900">Do you collect from a group?</h3>
      </div>
      <p className="mb-4 text-sm text-gray-500">
        {body ??
          'If you collect fees from a savings group, estate, school or club, set up your own portal in minutes — no setup fee, pay only when you collect.'}
      </p>
      <Link to={`/pay/${slug}/collect`}>
        <Button className="w-full sm:w-auto">Set up my collection →</Button>
      </Link>
    </div>
  )
}
