export const NETWORK_TYPES = [
  { value: 'ESTATE', label: 'Residential Estate / Property Management' },
  { value: 'CHAMA', label: 'Chama / Savings Group / Investment Club' },
  { value: 'SUPPLIER', label: 'Service Provider / Supplier (waste, security, cleaning)' },
  { value: 'DEBT', label: 'Lending / Cooperative / Loan Collections' },
]

export const FEE_PAYMENT_TYPES = [
  {
    value: 'SCHEDULED',
    label: 'Recurring obligation (service charge, dues) — full reminder sequence applies',
  },
  {
    value: 'OPEN',
    label: 'Optional payment (event, levy) — gentle reminders only, never marked overdue',
  },
  {
    value: 'WINDOWED',
    label: 'Time-limited obligation (annual renewal) — soft reminders during window, firm after',
  },
]

export const CHARGE_STATUSES = [
  { value: 'PENDING', label: 'Pending' },
  { value: 'PAID', label: 'Paid' },
  { value: 'OVERDUE', label: 'Overdue' },
  { value: 'PARTIALLY_PAID', label: 'Partially Paid' },
  { value: 'WAIVED', label: 'Waived' },
  { value: 'CANCELLED', label: 'Cancelled' },
]

export const FEE_TYPES = [
  { value: 'ASSIGNED', label: 'Assigned' },
  { value: 'OPEN', label: 'Open' },
]

export const FEE_FREQUENCIES = [
  { value: 'ONE_TIME', label: 'One Time' },
  { value: 'WEEKLY', label: 'Weekly' },
  { value: 'MONTHLY', label: 'Monthly' },
  { value: 'QUARTERLY', label: 'Quarterly' },
  { value: 'YEARLY', label: 'Yearly' },
]

export const PAYMENT_METHODS = [
  { value: 'PAYSTACK', label: 'Paystack' },
  { value: 'CASH', label: 'Cash' },
  { value: 'BANK_TRANSFER', label: 'Bank Transfer' },
  { value: 'OTHER', label: 'Other' },
]

export const REMINDER_CHANNELS = [
  { value: 'EMAIL', label: 'Email' },
  { value: 'SMS', label: 'SMS' },
  { value: 'WHATSAPP', label: 'WhatsApp' },
]

export const MEMBER_STATUSES = [
  { value: 'ACTIVE', label: 'Active' },
  { value: 'INACTIVE', label: 'Inactive' },
  { value: 'SUSPENDED', label: 'Suspended' },
]
