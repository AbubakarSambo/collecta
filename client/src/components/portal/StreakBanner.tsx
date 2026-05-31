import { Flame } from 'lucide-react'

interface StreakBannerProps {
  months: number
  subtitle?: string
}

/** Compact "🔥 N-month streak" banner shown on the Pay screen for identified members. */
export function StreakBanner({ months, subtitle }: StreakBannerProps) {
  if (!months || months < 1) return null
  return (
    <div className="flex items-center gap-3 rounded-lg border border-yellow-200 bg-yellow-50 px-4 py-3">
      <Flame className="h-6 w-6 shrink-0 text-yellow-500" />
      <div className="flex-1">
        <p className="text-sm font-bold text-gray-900">
          {months}-month payment streak
        </p>
        <p className="text-xs text-gray-500">
          {subtitle ?? "Pay on time to keep it going."}
        </p>
      </div>
      <span className="font-mono text-2xl font-semibold text-yellow-600">{months}</span>
    </div>
  )
}
