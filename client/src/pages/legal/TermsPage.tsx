import { Link } from 'react-router-dom'

const SECTIONS = [
  { title: 'Acceptance of Terms', body: 'By using Collecta you agree to these terms. If you do not agree, do not use the platform.' },
  { title: 'Description of Services', body: 'Collecta provides fee collection and payment management infrastructure for informal organisations. We are not a bank and do not hold funds in transit.' },
  { title: 'Payment Processing', body: 'Payments are processed by Paystack, a CBN-licensed payment processor. Collected funds are disbursed directly to the organisation\'s verified bank account.' },
  { title: 'Fees and Charges', body: 'A service charge is applied to each online payment (₦200 base + 2% of amount, capped at ₦3,000). The organisation always receives exactly the amount they set.' },
  { title: 'Verification', body: 'Organisations must be reviewed and approved by Collecta before their portal is activated. Verification involves identity and registration checks.' },
  { title: 'Prohibited Uses', body: 'You may not use Collecta for fraud, money laundering, or any activity that violates applicable law. See our Acceptable Use Policy for details.' },
  { title: 'Disputes', body: 'Payment disputes should be raised with the collecting organisation in the first instance. For platform-level issues, contact support@collecta.africa.' },
  { title: 'Contact', body: 'Collecta — support@collecta.africa' },
]

export function TermsPage() {
  return (
    <div className="max-w-2xl mx-auto py-12 px-4 space-y-8">
      <div>
        <Link to="/" className="text-sm text-gray-500 hover:underline">← Collecta</Link>
        <h1 className="mt-4 text-3xl font-bold text-gray-900">Terms of Service</h1>
        <p className="mt-2 text-sm text-gray-500">
          Full terms are being finalised with legal counsel and will be published here before the first live transaction.
          The outline below reflects the intended structure.
        </p>
      </div>

      <div className="space-y-6">
        {SECTIONS.map((s) => (
          <div key={s.title}>
            <h2 className="text-lg font-semibold text-gray-800">{s.title}</h2>
            <p className="mt-1 text-gray-600 text-sm">{s.body}</p>
          </div>
        ))}
      </div>

      <div className="border-t pt-6 flex gap-4 text-sm text-gray-400">
        <Link to="/privacy" className="hover:underline">Privacy Policy</Link>
        <Link to="/dpa" className="hover:underline">Data Processing Agreement</Link>
        <Link to="/acceptable-use" className="hover:underline">Acceptable Use</Link>
      </div>
    </div>
  )
}
