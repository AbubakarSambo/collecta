import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { cn } from '@/lib/utils'
import type { Benchmark } from './types'

interface PeerBenchmarkProps {
  benchmark?: Benchmark | null
}

function label(days: number | null): string {
  if (days === null) return '—'
  if (days > 0) return `${days}d early`
  if (days < 0) return `${Math.abs(days)}d late`
  return 'on time'
}

/** Three-bar "how you compare" benchmark (You / Top payers / Average). */
export function PeerBenchmark({ benchmark }: PeerBenchmarkProps) {
  if (!benchmark || benchmark.memberAvgDaysEarly === null) return null

  const rows = [
    { name: 'You', value: benchmark.memberAvgDaysEarly, accent: true },
    { name: 'Top payers', value: benchmark.topPayerAvgDaysEarly, accent: false },
    { name: 'Average', value: benchmark.networkAvgDaysEarly, accent: false },
  ]
  const max = Math.max(1, ...rows.map((r) => Math.abs(r.value ?? 0)))

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">How you compare</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {rows.map((r) => (
          <div key={r.name} className="flex items-center gap-3">
            <span className={cn('w-20 shrink-0 text-xs', r.accent ? 'font-bold text-gray-900' : 'text-gray-500')}>
              {r.name}
            </span>
            <div className="h-2 flex-1 overflow-hidden rounded-full bg-gray-100">
              <div
                className={cn('h-full rounded-full', r.accent ? 'bg-brand-500' : 'bg-gray-300')}
                style={{ width: `${Math.max(4, (Math.abs(r.value ?? 0) / max) * 100)}%` }}
              />
            </div>
            <span className={cn('w-16 shrink-0 text-right font-mono text-[11px]', r.accent ? 'font-bold text-gray-900' : 'text-gray-500')}>
              {label(r.value)}
            </span>
          </div>
        ))}
        <p className="rounded-md bg-green-50 px-3 py-2 text-xs text-green-700">{benchmark.note}</p>
      </CardContent>
    </Card>
  )
}
