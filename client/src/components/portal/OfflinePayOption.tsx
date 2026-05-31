import { Building2 } from 'lucide-react'
import { formatPhone } from '@/lib/utils'

interface OfflinePayOptionProps {
  phone?: string | null
}

/** "Prefer to pay in person?" fallback — only rendered when the network has a contact phone. */
export function OfflinePayOption({ phone }: OfflinePayOptionProps) {
  if (!phone) return null
  return (
    <div className="flex items-center gap-3 rounded-lg bg-gray-50 px-4 py-3">
      <Building2 className="h-5 w-5 shrink-0 text-gray-400" />
      <div>
        <p className="text-sm font-medium text-gray-900">Prefer to pay in person?</p>
        <p className="text-xs text-gray-500">
          Call <a href={`tel:${phone}`} className="font-medium text-brand-700 hover:underline">{formatPhone(phone)}</a> — same receipt either way.
        </p>
      </div>
    </div>
  )
}
