import { useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { PageHeader } from '@/components/shared/PageHeader'
import { Card, CardContent } from '@/components/ui/Card'

interface FaqItem {
  question: string
  answer: string
}

const FAQ_SECTIONS: { title: string; items: FaqItem[] }[] = [
  {
    title: 'Verification',
    items: [
      {
        question: 'Why do I need to verify my organisation?',
        answer:
          "Collecta routes payments directly to your bank account -- we never hold funds on your behalf. Verification confirms that the organisation and account details are legitimate before we activate your payment portal. It protects your members and ensures regulatory compliance.",
      },
      {
        question: 'What documents do I need for verification?',
        answer:
          "You need at least one of: a CAC registration number (for registered organisations), a BVN (for individual collectors or sole proprietors), or an NIN. You also need a contact address and your bank account number, which you will connect separately via Settings > Paystack.",
      },
      {
        question: 'How long does verification take?',
        answer:
          "Our team reviews verification requests within 24 hours on business days. You will receive an email once your application is approved or if we need more information.",
      },
      {
        question: 'Can I set things up while waiting for verification?',
        answer:
          "Yes -- you can add members, create fees, and connect your bank account while your verification is under review. Everything will be ready to go the moment you are approved.",
      },
      {
        question: 'My verification was rejected. What do I do?',
        answer:
          "Check the rejection reason on your dashboard or in Settings > Verification. Most rejections are due to mismatched details or incomplete information. Correct the issues and resubmit, or contact support@collecta.services for help.",
      },
    ],
  },
  {
    title: 'Payments & Bank Account',
    items: [
      {
        question: 'Does Collecta hold my money?',
        answer:
          "No. Collecta never holds funds. Every payment your members make goes directly to your linked bank account via Paystack. You must connect a verified bank account before your portal can accept payments.",
      },
      {
        question: 'How do I connect a bank account?',
        answer:
          "Go to Settings > Paystack. Enter your bank name and account number, then click Verify. Once verified, click Connect Account. Your portal will then be able to accept online payments.",
      },
      {
        question: 'What is the service charge?',
        answer:
          "Collecta charges a small service fee on each payment collected online: N200 + 2% of the fee amount, capped at N3,000. For example, a N5,000 fee would have a N300 service charge, so your member pays N5,300 and you receive N5,000 net.",
      },
      {
        question: 'How quickly do I receive payments?',
        answer:
          "Paystack settles funds to your bank account on a T+1 basis (next business day). Cash and manual bank transfer payments recorded by you are not processed through Collecta.",
      },
    ],
  },
  {
    title: 'SMS Credits',
    items: [
      {
        question: 'What are SMS credits?',
        answer:
          "SMS credits are used to send text message reminders to your members. One credit sends one SMS. Credits are consumed automatically when reminder sequences run.",
      },
      {
        question: 'How do I earn credits?',
        answer:
          "You earn 200 SMS credits automatically for every N1,000 in service charges collected through online payments. You can also top up credits at any time from Settings > SMS Credits.",
      },
      {
        question: 'What happens when I run out of credits?',
        answer:
          "SMS reminders are paused, but email reminders continue. You will receive a warning when your balance runs low. Top up any time -- credits never expire.",
      },
    ],
  },
  {
    title: 'Members & Charges',
    items: [
      {
        question: 'What is a ghost member?',
        answer:
          "A ghost member is someone who is active in your network, has at least one fee assigned to them, and has never made a payment. They appear on your dashboard as a flag so you can follow up -- they may have never received their invite link, or they may be avoiding payment.",
      },
      {
        question: 'What is a persistent non-payer?',
        answer:
          "A persistent non-payer is a member who has overdue charges in two or more consecutive months. This helps you identify habitual defaulters who may need direct escalation.",
      },
      {
        question: 'What is the difference between a fee and a charge?',
        answer:
          'A fee is the template -- it defines the amount, frequency, and rules (e.g. "Monthly Estate Dues -- N5,000/month"). A charge is the actual bill generated for a specific member at a specific time (e.g. "Chidi owes N5,000 for January 2024"). Fees create charges automatically on schedule.',
      },
      {
        question: 'Can members pay part of a charge?',
        answer:
          'Yes. Charges support partial payments and will show a "Partially Paid" status until the full amount is settled. The outstanding balance is tracked automatically.',
      },
    ],
  },
  {
    title: 'Fees',
    items: [
      {
        question: 'What is the difference between Assigned and Open fees?',
        answer:
          "Assigned fees are mandatory obligations -- members are expected to pay and will receive reminders until they do (e.g. monthly dues). Open fees are optional or event-based payments (e.g. a fundraiser or pool access top-up) -- members are not marked overdue for not paying them.",
      },
      {
        question: 'What does the payment type mean?',
        answer:
          "Scheduled fees generate charges on a recurring basis (weekly, monthly, etc.). Open fees are always-available and members pay when they choose. Windowed fees apply within a set date range -- reminders are gentle during the window and firm after it closes.",
      },
      {
        question: 'Can I set a start date for a fee?',
        answer:
          "Yes -- when creating a fee, you can set a start date so charges begin from a specific month. For one-time fees, you set the exact charge date. If no start date is set, charges begin from the current period.",
      },
    ],
  },
  {
    title: 'Reminders',
    items: [
      {
        question: 'How does the reminder system work?',
        answer:
          "Collecta sends automated reminders via email, SMS, and/or WhatsApp based on your reminder rules. The tone of reminders escalates over time -- starting friendly and becoming firmer as a charge becomes more overdue.",
      },
      {
        question: 'Can I send a reminder manually?',
        answer:
          'Yes -- on the Members page or a member\'s profile, you can trigger a manual reminder at any time via the "Send Reminder" button.',
      },
      {
        question: 'Can members opt out of SMS reminders?',
        answer:
          "Yes. Members can opt out of SMS notifications from their portal profile. They will still receive email reminders if they have an email on file.",
      },
    ],
  },
]

function FaqSection({ title, items }: { title: string; items: FaqItem[] }) {
  const [openIndex, setOpenIndex] = useState<number | null>(null)

  return (
    <div className="space-y-2">
      <h2 className="text-base font-semibold text-gray-900 border-b pb-2">{title}</h2>
      {items.map((item, i) => (
        <div key={i} className="rounded-lg border bg-white overflow-hidden">
          <button
            className="flex w-full items-center justify-between px-4 py-3 text-left text-sm font-medium text-gray-800 hover:bg-gray-50 transition-colors"
            onClick={() => setOpenIndex(openIndex === i ? null : i)}
          >
            <span>{item.question}</span>
            {openIndex === i ? (
              <ChevronUp className="h-4 w-4 text-gray-400 shrink-0 ml-3" />
            ) : (
              <ChevronDown className="h-4 w-4 text-gray-400 shrink-0 ml-3" />
            )}
          </button>
          {openIndex === i && (
            <div className="border-t bg-gray-50 px-4 py-3">
              <p className="text-sm text-gray-600 leading-relaxed">{item.answer}</p>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

export function FaqPage() {
  return (
    <div className="p-6 space-y-6 max-w-3xl">
      <PageHeader
        title="Frequently Asked Questions"
        description="Answers to common questions about Collecta"
      />

      <Card>
        <CardContent className="p-4 space-y-6">
          {FAQ_SECTIONS.map((section) => (
            <FaqSection key={section.title} title={section.title} items={section.items} />
          ))}
        </CardContent>
      </Card>

      <p className="text-sm text-gray-500 text-center">
        Still have questions?{' '}
        <a href="mailto:support@collecta.services" className="text-brand-700 font-medium hover:underline">
          Contact support
        </a>
      </p>
    </div>
  )
}
