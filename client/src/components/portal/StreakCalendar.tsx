import { Check } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { cn } from '@/lib/utils'
import type { StreakDot } from './types'

interface StreakCalendarProps {
  dots: StreakDot[]
  /** Consecutive months paid, shown as a headline if provided. */
  months?: number
}

const dotClass: Record<StreakDot['status'], string> = {
  paid: 'bg-green-500 text-white',
  upcoming: 'border-2 border-dashed border-yellow-400 bg-yellow-50 text-yellow-600',
  missed: 'bg-red-100 text-red-400',
  empty: 'bg-gray-100 text-gray-300',
}

/** Month-by-month dot grid visualising a member's payment history. */
export function StreakCalendar({ dots, months }: StreakCalendarProps) {
  if (!dots || dots.length === 0) return null
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">
          {months && months > 0 ? `🔥 ${months}-month streak` : 'Your payment streak'}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-6 gap-1.5">
          {dots.map((d) => (
            <div
              key={d.month}
              title={`${d.label} — ${d.status}`}
              className={cn(
                'flex h-8 items-center justify-center rounded-md text-[10px] font-semibold',
                dotClass[d.status],
              )}
            >
              {d.status === 'paid' ? <Check className="h-3.5 w-3.5" /> : d.label.charAt(0)}
            </div>
          ))}
        </div>
        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-gray-500">
          <span className="flex items-center gap-1"><span className="inline-block h-2.5 w-2.5 rounded-sm bg-green-500" /> Paid</span>
          <span className="flex items-center gap-1"><span className="inline-block h-2.5 w-2.5 rounded-sm border border-dashed border-yellow-400" /> Upcoming</span>
          <span className="flex items-center gap-1"><span className="inline-block h-2.5 w-2.5 rounded-sm bg-red-100" /> Missed</span>
        </div>
      </CardContent>
    </Card>
  )
}
