/**
 * Termii SMS smoke test — run with:
 *   TERMII_API_KEY=your_key npx tsx test-termii.ts +2347012345678
 *
 * Or set TERMII_API_KEY in .env and run:
 *   npx tsx -r dotenv/config test-termii.ts +2347012345678
 */

const [, , phone] = process.argv;

if (!phone) {
  console.error('Usage: npx tsx test-termii.ts +2347012345678');
  process.exit(1);
}

const API_KEY = process.env.TERMII_API_KEY;
const SENDER_ID = process.env.TERMII_SENDER_ID || 'Collecta';
const BASE_URL = process.env.TERMII_BASE_URL || 'https://v3.api.termii.com';

if (!API_KEY) {
  console.error('TERMII_API_KEY is not set. Add it to .env or pass it inline.');
  process.exit(1);
}

async function trySend(from: string, channel: string) {
  console.log(`\n→ Trying sender="${from}" channel="${channel}"...`);
  const res = await fetch(`${BASE_URL}/api/sms/send`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      to: phone,
      from,
      sms: 'Hi, this is a test message from Collecta. If you received this, Termii SMS is working!',
      type: 'plain',
      api_key: API_KEY,
      channel,
    }),
  });
  const data = await res.json();
  console.log(JSON.stringify(data, null, 2));
  return data.code === 'ok';
}

async function testSms() {
  console.log('\n--- SMS Delivery Tests ---');
  const combos: Array<[string, string]> = [
    ['N-Alert', 'dnd'],
    ['N-Alert', 'generic'],
    [SENDER_ID, 'generic'],
  ];

  for (const [from, channel] of combos) {
    const ok = await trySend(from, channel);
    if (ok) {
      console.log(`\n✓ SUCCESS — use TERMII_SENDER_ID="${from}" and channel="${channel}" in your config`);
      return;
    }
  }

  console.log('\n✗ All combinations failed — sender IDs are likely still pending approval.');
  console.log('  → Email support@termii.com to expedite N-Alert approval, or wait 24-48hrs.');
}

async function checkBalance() {
  console.log('\nChecking account balance...');
  const res = await fetch(`${BASE_URL}/api/get-balance?api_key=${API_KEY}`);
  const data = await res.json();
  console.log(JSON.stringify(data, null, 2));
}

async function listSenderIds() {
  console.log('\nFetching registered sender IDs...');
  const res = await fetch(`${BASE_URL}/api/sender-id?api_key=${API_KEY}`);
  const data = await res.json();
  console.log(JSON.stringify(data, null, 2));
  return data?.data ?? [];
}

(async () => {
  await checkBalance();
  const senderIds = await listSenderIds();
  if (senderIds.length > 0) {
    console.log('\nAvailable sender IDs:', senderIds.map((s: any) => `${s.sender_id} (${s.status})`).join(', '));
  }
  await testSms();
})();
