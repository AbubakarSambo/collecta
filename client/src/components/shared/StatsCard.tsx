import { type LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

interface StatsCardProps {
  title: string
  value: string | number
  icon: LucideIcon
  iconColor?: string
  iconBg?: string
  trend?: { value: number; label: string }
  description?: string
}

export function StatsCard({
  title,
  value,
  icon: Icon,
  iconColor = 'text-green-600',
  iconBg = 'bg-green-100',
  description,
}: StatsCardProps) {
  return (
    <div className="rounded-lg border bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-500">{title}</p>
          <p className="mt-2 text-2xl font-bold text-gray-900">{value}</p>
          {description && <p className="mt-1 text-xs text-gray-500">{description}</p>}
        </div>
        <div className={cn('flex h-12 w-12 items-center justify-center rounded-full', iconBg)}>
          <Icon className={cn('h-6 w-6', iconColor)} />
        </div>
      </div>
    </div>
  )
}
