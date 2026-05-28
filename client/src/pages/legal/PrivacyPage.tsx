import { Link } from 'react-router-dom'

const SECTIONS = [
  { title: 'What we collect', body: 'We collect name, email address, and phone number for members of registered organisations. We collect organisation name, contact details, and identity documents (CAC, BVN, NIN) for network administrators.' },
  { title: 'How we use it', body: 'Member data is used solely for payment processing and sending payment reminders on behalf of the organisation. We do not sell or share data with third parties for marketing purposes.' },
  { title: 'Payment data', body: 'Payment transactions are processed by Paystack. We store payment references and amounts. We do not store card numbers or bank credentials.' },
  { title: 'Data retention', body: 'Payment records are retained indefinitely and belong to the organisation. Members may request access to their own payment records at any time.' },
  { title: 'Your rights', body: 'You have the right to access, correct, or request deletion of your personal data. Contact support@collecta.services for data requests.' },
  { title: 'Security', body: 'All data is transmitted over HTTPS. Passwords are hashed using bcrypt. OTPs are time-limited and hashed before storage.' },
  { title: 'Contact', body: 'For privacy questions: support@collecta.services' },
]

export function PrivacyPage() {
  return (
    <div className="max-w-2xl mx-auto py-12 px-4 space-y-8">
      <div>
        <Link to="/" className="text-sm text-gray-500 hover:underline">← Collecta</Link>
        <h1 className="mt-4 text-3xl font-bold text-gray-900">Privacy Policy</h1>
        <p className="mt-2 text-sm text-gray-500">
          Full policy is being finalised with legal counsel. The outline below reflects our data practices.
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
        <Link to="/terms" className="hover:underline">Terms of Service</Link>
        <Link to="/dpa" className="hover:underline">Data Processing Agreement</Link>
        <Link to="/acceptable-use" className="hover:underline">Acceptable Use</Link>
      </div>
    </div>
  )
}
