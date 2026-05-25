import { Link } from 'react-router-dom'

const SECTIONS = [
  { title: 'Parties', body: 'This DPA is between Collecta (data processor) and the verified organisation using the Collecta platform (data controller).' },
  { title: 'Scope of processing', body: 'Collecta processes member names, email addresses, and phone numbers on behalf of the organisation, for the purpose of sending payment reminders and recording payment transactions.' },
  { title: 'Data controller obligations', body: 'The organisation is responsible for obtaining lawful basis to collect and process member personal data, and for ensuring members are informed that Collecta processes their data on the organisation\'s behalf.' },
  { title: 'Sub-processors', body: 'Collecta uses Paystack (payment processing), Africa\'s Talking (SMS delivery), and SendGrid (email delivery) as sub-processors. All are bound by data processing agreements.' },
  { title: 'Data transfers', body: 'Data is stored in Supabase (managed PostgreSQL) in a jurisdiction with adequate data protection standards. Cross-border transfers comply with applicable regulations.' },
  { title: 'Breach notification', body: 'Collecta will notify the organisation within 72 hours of becoming aware of a personal data breach affecting the organisation\'s member data.' },
  { title: 'Contact', body: 'For DPA questions: support@collecta.africa' },
]

export function DpaPage() {
  return (
    <div className="max-w-2xl mx-auto py-12 px-4 space-y-8">
      <div>
        <Link to="/" className="text-sm text-gray-500 hover:underline">← Collecta</Link>
        <h1 className="mt-4 text-3xl font-bold text-gray-900">Data Processing Agreement</h1>
        <p className="mt-2 text-sm text-gray-500">
          This DPA is being finalised with legal counsel. The outline below reflects our intended commitments.
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
        <Link to="/privacy" className="hover:underline">Privacy Policy</Link>
        <Link to="/acceptable-use" className="hover:underline">Acceptable Use</Link>
      </div>
    </div>
  )
}
