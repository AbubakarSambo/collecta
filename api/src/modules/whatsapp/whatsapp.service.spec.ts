import * as crypto from 'crypto';
import { WhatsappService } from './whatsapp.service';

function buildService(config: Record<string, any>) {
  const configService = { get: (key: string) => config[key] } as any;
  const prisma = {} as any;
  return new WhatsappService(prisma, configService);
}

describe('WhatsappService.mapDeliveryStatus', () => {
  const service = buildService({});

  it('maps Meta status strings to the internal enum', () => {
    expect(service.mapDeliveryStatus('sent')).toBe('SENT');
    expect(service.mapDeliveryStatus('delivered')).toBe('DELIVERED');
    expect(service.mapDeliveryStatus('read')).toBe('READ');
    expect(service.mapDeliveryStatus('failed')).toBe('FAILED');
  });

  it('returns null for an unrecognized status', () => {
    expect(service.mapDeliveryStatus('deleted')).toBeNull();
  });
});

describe('WhatsappService.verifyChallenge', () => {
  const service = buildService({ 'whatsapp.webhookVerifyToken': 'my-verify-token' });

  it('echoes the challenge when mode and token match', () => {
    expect(service.verifyChallenge('subscribe', 'my-verify-token', 'echo-me')).toBe('echo-me');
  });

  it('returns null when the token does not match', () => {
    expect(service.verifyChallenge('subscribe', 'wrong-token', 'echo-me')).toBeNull();
  });

  it('returns null when mode is not "subscribe"', () => {
    expect(service.verifyChallenge('unsubscribe', 'my-verify-token', 'echo-me')).toBeNull();
  });
});

describe('WhatsappService.verifyWebhookSignature', () => {
  const appSecret = 'test-app-secret';
  const service = buildService({ 'whatsapp.appSecret': appSecret });
  const rawBody = Buffer.from(JSON.stringify({ entry: [] }));

  function sign(body: Buffer, secret: string) {
    return `sha256=${crypto.createHmac('sha256', secret).update(body).digest('hex')}`;
  }

  it('accepts a signature computed with the correct secret', () => {
    expect(service.verifyWebhookSignature(rawBody, sign(rawBody, appSecret))).toBe(true);
  });

  it('rejects a signature computed with the wrong secret', () => {
    expect(service.verifyWebhookSignature(rawBody, sign(rawBody, 'wrong-secret'))).toBe(false);
  });

  it('rejects a signature for a tampered body', () => {
    const tampered = Buffer.from(JSON.stringify({ entry: ['tampered'] }));
    expect(service.verifyWebhookSignature(tampered, sign(rawBody, appSecret))).toBe(false);
  });

  it('rejects a header missing the sha256= prefix', () => {
    const hash = crypto.createHmac('sha256', appSecret).update(rawBody).digest('hex');
    expect(service.verifyWebhookSignature(rawBody, hash)).toBe(false);
  });
});
