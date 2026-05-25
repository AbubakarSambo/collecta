import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as https from 'https';
import * as crypto from 'crypto';

@Injectable()
export class PaystackService {
  private readonly logger = new Logger(PaystackService.name);
  private readonly baseUrl = 'https://api.paystack.co';

  constructor(private configService: ConfigService) {}

  private get secretKey() {
    return this.configService.get<string>('paystack.secretKey');
  }

  private async request<T>(
    method: string,
    path: string,
    data?: object,
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      const payload = data ? JSON.stringify(data) : '';

      const options = {
        hostname: 'api.paystack.co',
        port: 443,
        path,
        method,
        headers: {
          Authorization: `Bearer ${this.secretKey}`,
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(payload),
        },
      };

      const req = https.request(options, (res) => {
        let body = '';
        res.on('data', (chunk) => (body += chunk));
        res.on('end', () => {
          try {
            const parsed = JSON.parse(body);
            if (parsed.status) {
              resolve(parsed.data || parsed);
            } else {
              reject(new BadRequestException(parsed.message || 'Paystack error'));
            }
          } catch {
            reject(new Error('Failed to parse Paystack response'));
          }
        });
      });

      req.on('error', reject);

      if (payload) {
        req.write(payload);
      }

      req.end();
    });
  }

  async createPaymentLink(charge: {
    id: string;
    amount: number; // Naira — the org amount (excluding service charge)
    serviceCharge: number; // Naira — Collecta's service charge
    description?: string;
    member: { email?: string; firstName: string; lastName: string };
    network: { paystackSubaccountCode?: string; name: string };
  }): Promise<{ authorization_url: string; reference: string }> {
    const reference = `CHG-${charge.id}-${Date.now()}`;

    const orgAmountKobo = Math.round(charge.amount * 100);
    const serviceChargeKobo = Math.round(charge.serviceCharge * 100);
    const totalKobo = orgAmountKobo + serviceChargeKobo;

    const payload: any = {
      email: charge.member.email || `${charge.id}@collecta.noreply`,
      amount: totalKobo, // member pays total (org amount + service charge)
      reference,
      metadata: {
        chargeId: charge.id,
        networkName: charge.network.name,
        memberName: `${charge.member.firstName} ${charge.member.lastName}`,
        description: charge.description,
      },
      callback_url: `${this.configService.get<string>('app.frontendUrl')}/payment/callback`,
    };

    // When a subaccount exists, use Paystack's split to route org amount to the
    // subaccount and keep the service charge in the main (Collecta) account.
    if (charge.network.paystackSubaccountCode) {
      payload.subaccount = charge.network.paystackSubaccountCode;
      payload.bearer = 'subaccount'; // Paystack fees borne by subaccount
      payload.transaction_charge = serviceChargeKobo; // amount kept by main account
    }

    const result = await this.request<any>('POST', '/transaction/initialize', payload);

    return {
      authorization_url: result.authorization_url,
      reference: result.reference,
    };
  }

  async verifyPayment(reference: string): Promise<{
    status: string;
    amount: number;
    reference: string;
    metadata: any;
  }> {
    const result = await this.request<any>('GET', `/transaction/verify/${reference}`);

    return {
      status: result.status,
      amount: result.amount / 100, // Convert from kobo
      reference: result.reference,
      metadata: result.metadata,
    };
  }

  async createSubaccount(data: {
    businessName: string;
    bankCode: string;
    accountNumber: string;
    percentageCharge?: number;
  }): Promise<{ id: string; subaccount_code: string }> {
    const result = await this.request<any>('POST', '/subaccount', {
      business_name: data.businessName,
      bank_code: data.bankCode,
      account_number: data.accountNumber,
      percentage_charge: data.percentageCharge || 0,
    });

    return {
      id: result.id,
      subaccount_code: result.subaccount_code,
    };
  }

  async verifyBankAccount(accountNumber: string, bankCode: string): Promise<{
    account_name: string;
    account_number: string;
  }> {
    const result = await this.request<any>(
      'GET',
      `/bank/resolve?account_number=${accountNumber}&bank_code=${bankCode}`,
    );

    return {
      account_name: result.account_name,
      account_number: result.account_number,
    };
  }

  async listBanks(): Promise<Array<{ name: string; code: string; slug: string }>> {
    const result = await this.request<any>('GET', '/bank?country=nigeria&perPage=100');
    return Array.isArray(result) ? result : [];
  }

  verifyWebhookSignature(rawBody: Buffer, signature: string): boolean {
    const hash = crypto
      .createHmac('sha512', this.secretKey)
      .update(rawBody)
      .digest('hex');

    return hash === signature;
  }
}
