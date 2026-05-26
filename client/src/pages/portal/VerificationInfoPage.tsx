import { Link } from 'react-router-dom'
import { ShieldCheck, ArrowLeft, CheckCircle } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/Card'

const CHECKS = [
  'Organisation name and contact details verified',
  'CAC registration number (or BVN for individual collectors) confirmed',
  'Bank account linked and verified via Paystack',
  'Reviewed by Collecta staff before portal activation',
]

export function VerificationInfoPage() {
  return (
    <div className="max-w-lg mx-auto py-12 px-4 space-y-8">
      <Link
        to={-1 as any}
        className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
      >
        <ArrowLeft className="h-4 w-4" /> Back
      </Link>

      <div className="text-center space-y-3">
        <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
          <ShieldCheck className="h-9 w-9 text-green-600" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900">Verified by Collecta</h1>
        <p className="text-gray-500 max-w-sm mx-auto">
          This badge means Collecta has reviewed and approved this organisation before their payment
          portal went live.
        </p>
      </div>

      <Card>
        <CardContent className="p-5 space-y-3">
          <p className="text-sm font-semibold text-gray-700">What verification includes:</p>
          <ul className="space-y-2">
            {CHECKS.map((check) => (
              <li key={check} className="flex items-start gap-2 text-sm text-gray-600">
                <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                {check}
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-5 space-y-2">
          <p className="text-sm font-semibold text-gray-700">What it means for you</p>
          <p className="text-sm text-gray-600">
            When you pay through a verified portal, your money goes directly to the organisation's
            verified bank account via Paystack's secure payment infrastructure. Collecta does not
            hold your funds at any point.
          </p>
        </CardContent>
      </Card>

      <p className="text-center text-xs text-gray-400">
        Questions? Contact{' '}
        <a href="mailto:support@collecta.services" className="underline">
          support@collecta.services
        </a>
      </p>
    </div>
  )
}
