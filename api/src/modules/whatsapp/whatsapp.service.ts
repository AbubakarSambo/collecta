import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import { WhatsappDeliveryStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

const STATUS_RANK: Record<WhatsappDeliveryStatus, number> = {
  SENT: 1,
  DELIVERED: 2,
  READ: 3,
  FAILED: 99,
};

@Injectable()
export class WhatsappService {
  private readonly logger = new Logger(WhatsappService.name);

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {}

  private get accessToken() {
    return this.configService.get<string>('whatsapp.accessToken');
  }

  private get phoneNumberId() {
    return this.configService.get<string>('whatsapp.phoneNumberId');
  }

  private get appSecret() {
    return this.configService.get<string>('whatsapp.appSecret');
  }

  private get apiVersion() {
    return this.configService.get<string>('whatsapp.apiVersion');
  }

  async sendTemplate(
    phone: string,
    templateName: string,
    languageCode: string,
    parameters: string[],
  ): Promise<{ providerMessageId: string } | undefined> {
    if (!this.accessToken || !this.phoneNumberId) {
      this.logger.warn(
        `sendTemplate: skipping ${phone} — WHATSAPP_ACCESS_TOKEN or WHATSAPP_PHONE_NUMBER_ID not configured`,
      );
      return undefined;
    }

    if (!templateName) {
      this.logger.warn(`sendTemplate: skipping ${phone} — no template name provided`);
      return undefined;
    }

    const response = await fetch(
      `https://graph.facebook.com/${this.apiVersion}/${this.phoneNumberId}/messages`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: phone,
          type: 'template',
          template: {
            name: templateName,
            language: { code: languageCode },
            components: [
              {
                type: 'body',
                parameters: parameters.map((text) => ({ type: 'text', text })),
              },
            ],
          },
        }),
      },
    );

    const data = (await response.json()) as any;

    if (!response.ok) {
      this.logger.warn(`sendTemplate: Meta rejected ${phone} — ${JSON.stringify(data)}`);
      throw new Error(`Meta WhatsApp send failed: ${data?.error?.message ?? response.status}`);
    }

    const providerMessageId = data?.messages?.[0]?.id;
    this.logger.log(`sendTemplate: sent to ${phone} template=${templateName} id=${providerMessageId}`);
    return { providerMessageId };
  }

  verifyChallenge(mode: string, token: string, challenge: string): string | null {
    const verifyToken = this.configService.get<string>('whatsapp.webhookVerifyToken');
    if (mode === 'subscribe' && !!verifyToken && token === verifyToken) {
      return challenge;
    }
    return null;
  }

  verifyWebhookSignature(rawBody: Buffer, signatureHeader: string): boolean {
    if (!signatureHeader?.startsWith('sha256=')) {
      return false;
    }

    const expected = crypto
      .createHmac('sha256', this.appSecret)
      .update(rawBody)
      .digest('hex');
    const provided = signatureHeader.slice('sha256='.length);

    const expectedBuf = Buffer.from(expected, 'hex');
    const providedBuf = Buffer.from(provided, 'hex');

    if (expectedBuf.length !== providedBuf.length) {
      return false;
    }

    return crypto.timingSafeEqual(expectedBuf, providedBuf);
  }

  mapDeliveryStatus(rawStatus: string): WhatsappDeliveryStatus | null {
    switch (rawStatus) {
      case 'sent':
        return 'SENT';
      case 'delivered':
        return 'DELIVERED';
      case 'read':
        return 'READ';
      case 'failed':
        return 'FAILED';
      default:
        return null;
    }
  }

  async handleStatusWebhook(rawBody: Buffer, signatureHeader: string) {
    if (!this.verifyWebhookSignature(rawBody, signatureHeader)) {
      throw new UnauthorizedException('Invalid webhook signature');
    }

    const body = JSON.parse(rawBody.toString());

    for (const entry of body.entry ?? []) {
      for (const change of entry.changes ?? []) {
        const statuses = change.value?.statuses ?? [];
        for (const statusEvent of statuses) {
          await this.processStatusEvent(statusEvent);
        }
      }
    }

    return { received: true };
  }

  private async processStatusEvent(statusEvent: any) {
    const providerMessageId = statusEvent?.id;
    const status = this.mapDeliveryStatus(statusEvent?.status);

    if (!providerMessageId || !status) {
      return;
    }

    try {
      await this.prisma.whatsappStatusEvent.create({
        data: {
          providerMessageId,
          status,
          recipientPhone: statusEvent.recipient_id ?? null,
          errorCode: statusEvent.errors?.[0]?.code ?? null,
          errorTitle: statusEvent.errors?.[0]?.title ?? null,
          timestamp: new Date(Number(statusEvent.timestamp) * 1000),
          rawPayload: statusEvent,
        },
      });
    } catch (err: any) {
      if (err?.code === 'P2002') {
        // Exact duplicate redelivery of the same message+status — Meta retries at-least-once.
        return;
      }
      throw err;
    }

    await this.bumpDenormalizedStatus(providerMessageId, status);
  }

  private async bumpDenormalizedStatus(providerMessageId: string, status: WhatsappDeliveryStatus) {
    await this.prisma.$transaction(async (tx) => {
      for (const model of ['reminder', 'reminderLog'] as const) {
        const row = await (tx[model] as any).findFirst({ where: { providerMessageId } });
        if (!row) {
          continue;
        }

        const currentRank = row.whatsappStatus ? STATUS_RANK[row.whatsappStatus as WhatsappDeliveryStatus] : 0;
        if (STATUS_RANK[status] > currentRank) {
          await (tx[model] as any).update({
            where: { id: row.id },
            data: { whatsappStatus: status, whatsappStatusAt: new Date() },
          });
        }
      }
    });
  }
}
