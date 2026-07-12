// Enums
export type NetworkType = 'ESTATE' | 'CHAMA' | 'SUPPLIER' | 'DEBT' | 'GYM' | 'COMMUNITY' | 'SCHOOL' | 'CHURCH' | 'SPORTS' | 'COOPERATIVE'
export type FeePaymentType = 'SCHEDULED' | 'OPEN' | 'WINDOWED'
export type VerificationStatus = 'PENDING' | 'APPROVED' | 'REJECTED'
export type ReminderTone = 'FRIENDLY' | 'CLEAR' | 'FIRM' | 'FORMAL'

// Auth
export interface User {
  id: string
  email: string
  firstName: string
  lastName: string
  role: 'SUPER_ADMIN' | 'NETWORK_ADMIN'
  isPlatformAdmin: boolean
  isEmailVerified: boolean
  networkId: string | null
  networkName: string | null
  networkSlug: string | null
  network?: Network | null
}

// Network
export interface Network {
  id: string
  name: string
  slug: string
  description?: string
  logoUrl?: string
  adminId: string
  paystackSubaccountCode?: string
  bankAccountNumber?: string
  bankAccountName?: string
  bankCode?: string
  currency: string
  timezone: string
  isActive: boolean
  networkType?: NetworkType
  verificationStatus?: VerificationStatus
  verificationNotes?: string
  isVerified?: boolean
  hasSubmittedVerification?: boolean
  smsCredits?: number
  brandColor?: string
  contactPhone?: string
  createdAt: string
  updatedAt: string
  _count?: {
    members: number
    fees: number
    charges: number
  }
}

// Member
export type MemberStatus = 'ACTIVE' | 'INACTIVE' | 'SUSPENDED'

export interface Member {
  id: string
  networkId: string
  firstName: string
  lastName: string
  email?: string
  phone?: string
  memberCode?: string
  unit?: string
  notes?: string
  status: MemberStatus
  smsOptedOut?: boolean
  whatsappOptedIn?: boolean
  consecutiveMonthsPaid?: number
  inviteToken?: string
  joinedAt: string
  createdAt: string
  updatedAt: string
  chargesSummary?: { paid: number; total: number }
  _count?: { charges: number }
}

// Fee
export type FeeType = 'ASSIGNED' | 'OPEN'
export type FeeFrequency = 'ONE_TIME' | 'WEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'YEARLY'

export interface Fee {
  id: string
  networkId: string
  name: string
  description?: string
  type: FeeType
  paymentType?: FeePaymentType
  amount: number
  frequency: FeeFrequency
  dueDay: number
  startDate?: string
  penaltyEnabled: boolean
  penaltyPercent: number
  penaltyGraceDays: number
  options?: Array<{ name: string; amount: number }>
  isActive: boolean
  createdAt: string
  updatedAt: string
  _count?: {
    assignments: number
    charges: number
  }
}

// Charge
export type ChargeStatus = 'PENDING' | 'PAID' | 'OVERDUE' | 'PARTIALLY_PAID' | 'WAIVED' | 'CANCELLED'

export interface Charge {
  id: string
  networkId: string
  memberId: string
  feeId?: string
  assignmentId?: string
  amount: number
  paidAmount: number
  dueDate: string
  status: ChargeStatus
  penaltyApplied: boolean
  penaltyAmount: number
  paystackPaymentLink?: string
  description?: string
  paidAt?: string
  createdAt: string
  updatedAt: string
  member?: Pick<Member, 'id' | 'firstName' | 'lastName' | 'unit'>
  fee?: Pick<Fee, 'id' | 'name'>
}

// Payment
export type PaymentMethod = 'PAYSTACK' | 'CASH' | 'BANK_TRANSFER' | 'OTHER'

export interface Payment {
  id: string
  networkId: string
  chargeId: string
  memberId: string
  amount: number
  method: PaymentMethod
  paystackReference?: string
  metadata?: Record<string, unknown>
  recordedById?: string
  createdAt: string
  member?: Pick<Member, 'id' | 'firstName' | 'lastName' | 'unit'>
  charge?: Charge & { fee?: Pick<Fee, 'id' | 'name'> }
}

// Reminder
export type ReminderChannel = 'EMAIL' | 'SMS' | 'WHATSAPP'
export type ReminderStatus = 'PENDING' | 'SENT' | 'FAILED'

export interface Reminder {
  id: string
  networkId: string
  memberId: string
  chargeId?: string
  channel: ReminderChannel
  status: ReminderStatus
  message?: string
  sentAt?: string
  createdAt: string
  member?: Pick<Member, 'id' | 'firstName' | 'lastName'>
}

// Audit Log
export interface AuditLog {
  id: string
  networkId: string
  actorId?: string
  action: string
  entityType?: string
  entityId?: string
  metadata?: Record<string, unknown>
  createdAt: string
}

// API Response wrappers
export interface ApiResponse<T> {
  success: boolean
  data: T
  message?: string
}

export interface PaginatedResponse<T> {
  data: T[]
  meta: {
    total: number
    page: number
    limit: number
    totalPages: number
  }
}

// Dashboard summary
export interface ChargeSummary {
  totalMembers: number
  pendingChargesAmount: number
  pendingChargesCount: number
  overdueChargesAmount: number
  overdueChargesCount: number
  collectedThisMonth: number
}
