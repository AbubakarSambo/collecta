import { Receipt, FolderOpen, Zap } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'

interface ValueOfDigitalCardProps {
  /** Optional personalised lines, e.g. "4 organisations · 15 payments on record". */
  recordNote?: string
  organisationsNote?: string
}

/** Static "what you get by paying digitally" value-sell card for the History screen. */
export function ValueOfDigitalCard({ recordNote, organisationsNote }: ValueOfDigitalCardProps) {
  const rows = [
    {
      Icon: Receipt,
      title: 'A permanent receipt for every payment',
      desc: 'Reference number, date and amount. If there is ever a dispute, you have proof that never gets lost.',
      you: recordNote,
    },
    {
      Icon: FolderOpen,
      title: 'All your payments in one place',
      desc: 'Every organisation you pay through Collecta — no digging through bank statements.',
      you: organisationsNote,
    },
    {
      Icon: Zap,
      title: 'Pay from anywhere in minutes',
      desc: 'No office visit, no queue, no cash. The link works from any phone.',
    },
  ]
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">What you get by paying digitally</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {rows.map(({ Icon, title, desc, you }) => (
          <div key={title} className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-yellow-50">
              <Icon className="h-4 w-4 text-yellow-600" />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900">{title}</p>
              <p className="text-xs text-gray-500">{desc}</p>
              {you && <p className="mt-1 text-xs font-medium text-green-700">✓ {you}</p>}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
