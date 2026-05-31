export type StreakDotStatus = 'paid' | 'missed' | 'upcoming' | 'empty'

export interface StreakDot {
  month: string
  label: string
  status: StreakDotStatus
}

export interface Benchmark {
  memberAvgDaysEarly: number | null
  networkAvgDaysEarly: number | null
  topPayerAvgDaysEarly: number | null
  sampleSize: number
  note: string
}

export interface NetworkStats {
  totalMembers: number
  membersCurrentWithPayments: number
}

export interface TierTag {
  tier: 'TOP' | 'SECOND' | null
  label: string | null
}
