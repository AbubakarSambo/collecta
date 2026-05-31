import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ArrowLeft, Building2, PiggyBank, Truck, Landmark } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { formatCurrency } from '@/lib/utils'
import { cn } from '@/lib/utils'

const HOURLY_OPPORTUNITY_COST = 2500

const COLLECT_TYPES = [
  { value: 'ESTATE', label: 'Estate or housing', desc: 'Service charges, levies', Icon: Building2 },
  { value: 'CHAMA', label: 'Savings group or chama', desc: 'Monthly contributions, dues', Icon: PiggyBank },
  { value: 'SUPPLIER', label: 'Service provider', desc: 'Waste, security, cleaning', Icon: Truck },
  { value: 'DEBT', label: 'Lending or cooperative', desc: 'Loan collections, repayments', Icon: Landmark },
]

export function CollectPage() {
  const { slug } = useParams<{ slug: string }>()
  const [members, setMembers] = useState('')
  const [hours, setHours] = useState('')
  const [type, setType] = useState('ESTATE')

  const m = parseFloat(members)
  const h = parseFloat(hours)
  const hasResult = !isNaN(m) && !isNaN(h) && m > 0 && h > 0
  const monthly = hasResult ? Math.round(h * HOURLY_OPPORTUNITY_COST) : 0
  const yearly = monthly * 12

  const registerHref = `/register?ref=${encodeURIComponent(slug ?? '')}&type=${type}`

  return (
    <div className="max-w-md mx-auto space-y-6">
      <Link
        to={`/pay/${slug}`}
        className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
      >
        <ArrowLeft className="h-4 w-4" /> Back to portal
      </Link>

      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900">How much time do you spend chasing payments?</h2>
        <p className="mt-2 text-sm text-gray-500">
          Estimate your overhead — then see what happens when it disappears.
        </p>
      </div>

      {/* Calculator */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Your monthly collection overhead</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm text-gray-600">Number of members</label>
            <Input type="number" min={1} placeholder="e.g. 30" value={members} onChange={(e) => setMembers(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm text-gray-600">Hours chasing payments per month</label>
            <Input type="number" min={0.5} step={0.5} placeholder="e.g. 4" value={hours} onChange={(e) => setHours(e.target.value)} />
          </div>
          <div className="flex items-center justify-between rounded-lg bg-gray-900 px-4 py-3 text-white">
            <div>
              <p className="text-xs text-gray-400">Monthly overhead</p>
              <p className="font-mono text-2xl font-semibold text-yellow-400">
                {hasResult ? formatCurrency(monthly) : '—'}
              </p>
              <p className="text-[10px] text-gray-500">at {formatCurrency(HOURLY_OPPORTUNITY_COST)}/hour opportunity cost</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-400">Per year</p>
              <p className="font-mono text-base font-semibold text-gray-200">
                {hasResult ? formatCurrency(yearly) : '—'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Type selector */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">What do you collect for?</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {COLLECT_TYPES.map(({ value, label, desc, Icon }) => (
            <button
              key={value}
              type="button"
              onClick={() => setType(value)}
              className={cn(
                'flex w-full items-center gap-3 rounded-lg border p-3 text-left transition-colors',
                type === value ? 'border-primary bg-brand-50' : 'border-gray-200 hover:border-gray-300',
              )}
            >
              <Icon className={cn('h-5 w-5 shrink-0', type === value ? 'text-brand-700' : 'text-gray-400')} />
              <div>
                <p className="text-sm font-semibold text-gray-900">{label}</p>
                <p className="text-xs text-gray-500">{desc}</p>
              </div>
            </button>
          ))}
        </CardContent>
      </Card>

      {/* CTA */}
      <div className="space-y-3">
        <Link to={registerHref}>
          <Button className="w-full" size="lg">Create my free account →</Button>
        </Link>
        <p className="text-center text-xs text-gray-500">
          No setup fee · No subscription · Pay only when you collect
        </p>
      </div>

      <Card>
        <CardContent className="p-5">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-400">What happens next</p>
          <ol className="space-y-2 text-sm text-gray-600">
            <li><strong className="text-gray-900">1. Create account.</strong> Name and email, 2 minutes.</li>
            <li><strong className="text-gray-900">2. Add members and create a fee.</strong> About 10 minutes.</li>
            <li><strong className="text-gray-900">3. We verify you.</strong> Usually within 24 hours.</li>
            <li><strong className="text-gray-900">4. Share your portal.</strong> First payment lands next business day.</li>
          </ol>
        </CardContent>
      </Card>
    </div>
  )
}
