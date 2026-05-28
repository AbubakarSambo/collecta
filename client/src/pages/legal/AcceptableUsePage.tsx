import { Link } from 'react-router-dom'

const PERMITTED = [
  'Collecting periodic membership dues, levies, and contributions',
  'Collecting one-time payments for events, services, or shared expenses',
  'Sending automated payment reminders to members of your organisation',
  'Recording cash and bank transfer payments made offline',
]

const PROHIBITED = [
  'Collecting payments for illegal goods or services',
  'Using the platform for personal fundraising unrelated to an organisation',
  'Impersonating another organisation or individual',
  'Using member data collected through Collecta for purposes other than payment management',
  'Blacklisting members for reasons unrelated to payment non-compliance',
  'Sending unsolicited commercial messages to members',
]

export function AcceptableUsePage() {
  return (
    <div className="max-w-2xl mx-auto py-12 px-4 space-y-8">
      <div>
        <Link to="/" className="text-sm text-gray-500 hover:underline">← Collecta</Link>
        <h1 className="mt-4 text-3xl font-bold text-gray-900">Acceptable Use Policy</h1>
        <p className="mt-2 text-sm text-gray-500">
          Collecta is a fee collection platform for legitimate organisations. This policy describes what it may and may not be used for.
        </p>
      </div>

      <div>
        <h2 className="text-lg font-semibold text-gray-800 mb-3">Permitted uses</h2>
        <ul className="space-y-2">
          {PERMITTED.map((item) => (
            <li key={item} className="flex items-start gap-2 text-sm text-gray-600">
              <span className="text-green-500 font-bold mt-0.5">✓</span>
              {item}
            </li>
          ))}
        </ul>
      </div>

      <div>
        <h2 className="text-lg font-semibold text-gray-800 mb-3">Prohibited uses</h2>
        <ul className="space-y-2">
          {PROHIBITED.map((item) => (
            <li key={item} className="flex items-start gap-2 text-sm text-gray-600">
              <span className="text-red-500 font-bold mt-0.5">✗</span>
              {item}
            </li>
          ))}
        </ul>
      </div>

      <div className="rounded-lg border border-orange-200 bg-orange-50 p-4">
        <p className="text-sm text-orange-800">
          Violations of this policy may result in immediate suspension of your network's portal without notice.
          If you believe your organisation has been incorrectly suspended, contact support@collecta.services.
        </p>
      </div>

      <div className="border-t pt-6 flex gap-4 text-sm text-gray-400">
        <Link to="/terms" className="hover:underline">Terms of Service</Link>
        <Link to="/privacy" className="hover:underline">Privacy Policy</Link>
        <Link to="/dpa" className="hover:underline">Data Processing Agreement</Link>
      </div>
    </div>
  )
}
