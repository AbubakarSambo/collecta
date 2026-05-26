import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private resend: Resend;
  private fromEmail: string;
  private frontendUrl: string;

  constructor(private configService: ConfigService) {
    this.resend = new Resend(this.configService.get<string>('resend.apiKey'));
    this.fromEmail =
      this.configService.get<string>('resend.fromEmail') || 'Collecta <noreply@collecta.africa>';
    this.frontendUrl =
      this.configService.get<string>('resend.frontendUrl') || 'http://localhost:5173';
  }

  private async sendEmail(options: { to: string; subject: string; html: string }): Promise<void> {
    const { data, error } = await this.resend.emails.send({
      from: this.fromEmail,
      ...options,
    });

    if (error) {
      this.logger.error(`Failed to send email to ${options.to}: ${error.name} - ${error.message}`);
      throw new Error(`Failed to send email: ${error.message}`);
    }

    this.logger.log(`Email sent to ${options.to} (id: ${data?.id})`);
  }

  async sendVerificationEmail(email: string, firstName: string, token: string): Promise<void> {
    const verifyUrl = `${this.frontendUrl}/verify-email?token=${token}`;

    await this.sendEmail({
      to: email,
      subject: 'Verify your Collecta account',
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Welcome to Collecta, ${firstName}!</h2>
          <p>Thank you for signing up. Please verify your email address to get started.</p>
          <div style="margin: 32px 0;">
            <a href="${verifyUrl}"
               style="display: inline-block; background: #16a34a; color: white; padding: 12px 24px;
                      text-decoration: none; border-radius: 6px;">
              Verify Email Address
            </a>
          </div>
          <p style="color: #6b7280; font-size: 14px;">Or copy this link: ${verifyUrl}</p>
          <p style="color: #6b7280; font-size: 14px;">This link expires in 24 hours.</p>
          <p style="color: #6b7280; font-size: 14px;">If you did not create a Collecta account, please ignore this email.</p>
        </div>
      `,
    });
  }

  async sendPasswordResetEmail(email: string, firstName: string, token: string): Promise<void> {
    const resetUrl = `${this.frontendUrl}/reset-password?token=${token}`;

    await this.sendEmail({
      to: email,
      subject: 'Reset your Collecta password',
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Password Reset Request</h2>
          <p>Hi ${firstName},</p>
          <p>We received a request to reset your password. Click the button below to choose a new one.</p>
          <div style="margin: 32px 0;">
            <a href="${resetUrl}"
               style="display: inline-block; background: #16a34a; color: white; padding: 12px 24px;
                      text-decoration: none; border-radius: 6px;">
              Reset Password
            </a>
          </div>
          <p style="color: #6b7280; font-size: 14px;">Or copy this link: ${resetUrl}</p>
          <p style="color: #6b7280; font-size: 14px;">This link expires in 1 hour.</p>
          <p style="color: #6b7280; font-size: 14px;">If you did not request a password reset, please ignore this email.</p>
        </div>
      `,
    });
  }

  async sendWelcomeEmail(email: string, firstName: string, networkName: string): Promise<void> {
    await this.sendEmail({
      to: email,
      subject: `Your Collecta network "${networkName}" is ready`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Your network is live, ${firstName}!</h2>
          <p>Your Collecta network <strong>${networkName}</strong> has been set up successfully.</p>
          <p>You can now:</p>
          <ul>
            <li>Add members to your network</li>
            <li>Create fees and assign them to members</li>
            <li>Track payments and send reminders</li>
          </ul>
          <div style="margin: 32px 0;">
            <a href="${this.frontendUrl}/dashboard"
               style="display: inline-block; background: #16a34a; color: white; padding: 12px 24px;
                      text-decoration: none; border-radius: 6px;">
              Go to Dashboard
            </a>
          </div>
        </div>
      `,
    });
  }

  async sendFeeReminderEmail(
    email: string,
    firstName: string,
    networkName: string,
    feeName: string,
    amount: number,
    dueDate: Date,
    paymentUrl: string,
    customMessage?: string,
    tone: 'FRIENDLY' | 'CLEAR' | 'FIRM' | 'FORMAL' = 'CLEAR',
  ): Promise<void> {
    const formattedAmount = new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
    }).format(amount);

    const formattedDate = dueDate.toLocaleDateString('en-NG', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });

    const toneConfig: Record<string, { subject: string; greeting: string; ctaColor: string }> = {
      FRIENDLY: {
        subject: `Reminder: ${feeName} is due soon`,
        greeting: `Hi ${firstName},`,
        ctaColor: '#16a34a',
      },
      CLEAR: {
        subject: `${feeName} — ${formattedAmount} due today`,
        greeting: `Hi ${firstName},`,
        ctaColor: '#2563eb',
      },
      FIRM: {
        subject: `Action required: ${feeName} is overdue`,
        greeting: `${firstName},`,
        ctaColor: '#d97706',
      },
      FORMAL: {
        subject: `Overdue notice: ${feeName} — ${formattedAmount}`,
        greeting: `${firstName},`,
        ctaColor: '#dc2626',
      },
    };

    const toneBody: Record<string, string> = {
      FRIENDLY: customMessage
        ? `<p>${customMessage}</p>`
        : `<p>Your payment for <strong>${feeName}</strong> is coming up. Pay at your convenience before the due date to stay current.</p>`,
      CLEAR: customMessage
        ? `<p>${customMessage}</p>`
        : `<p>Your payment for <strong>${feeName}</strong> of ${formattedAmount} is due today.</p>`,
      FIRM: customMessage
        ? `<p>${customMessage}</p>`
        : `<p>Your payment for <strong>${feeName}</strong> of ${formattedAmount} is now overdue. Please settle this as soon as possible.</p>`,
      FORMAL: customMessage
        ? `<p>${customMessage}</p>`
        : `<p>Your payment for <strong>${feeName}</strong> of ${formattedAmount} remains outstanding. Continued non-payment may affect your access. Please settle this immediately.</p>`,
    };

    const cfg = toneConfig[tone] || toneConfig['CLEAR'];

    await this.sendEmail({
      to: email,
      subject: cfg.subject,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <p>${cfg.greeting}</p>
          ${toneBody[tone] || toneBody['CLEAR']}
          <table style="border-collapse: collapse; width: 100%; margin: 16px 0;">
            <tr>
              <td style="padding: 8px; border: 1px solid #e5e7eb;">Fee</td>
              <td style="padding: 8px; border: 1px solid #e5e7eb;"><strong>${feeName}</strong></td>
            </tr>
            <tr>
              <td style="padding: 8px; border: 1px solid #e5e7eb;">Amount</td>
              <td style="padding: 8px; border: 1px solid #e5e7eb;"><strong>${formattedAmount}</strong></td>
            </tr>
            <tr>
              <td style="padding: 8px; border: 1px solid #e5e7eb;">Due Date</td>
              <td style="padding: 8px; border: 1px solid #e5e7eb;">${formattedDate}</td>
            </tr>
          </table>
          <div style="margin: 32px 0;">
            <a href="${paymentUrl}"
               style="display: inline-block; background: ${cfg.ctaColor}; color: white; padding: 12px 24px;
                      text-decoration: none; border-radius: 6px; font-weight: 600;">
              Pay Now
            </a>
          </div>
          <p style="color: #6b7280; font-size: 12px;">Sent via Collecta on behalf of ${networkName}</p>
        </div>
      `,
    });
  }

  async sendFeeAssignmentEmail(
    email: string,
    firstName: string,
    networkName: string,
    feeName: string,
    amount: number,
    dueDate: Date,
    paymentUrl: string,
  ): Promise<void> {
    const formattedAmount = new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
    }).format(amount);

    const formattedDate = dueDate.toLocaleDateString('en-NG', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });

    await this.sendEmail({
      to: email,
      subject: `You have a new payment due: ${feeName}`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>New Payment Due</h2>
          <p>Hi ${firstName},</p>
          <p>You have been assigned a fee by <strong>${networkName}</strong>.</p>
          <table style="border-collapse: collapse; width: 100%; margin: 16px 0;">
            <tr>
              <td style="padding: 8px; border: 1px solid #e5e7eb;">Fee</td>
              <td style="padding: 8px; border: 1px solid #e5e7eb;"><strong>${feeName}</strong></td>
            </tr>
            <tr>
              <td style="padding: 8px; border: 1px solid #e5e7eb;">Amount Due</td>
              <td style="padding: 8px; border: 1px solid #e5e7eb;"><strong>${formattedAmount}</strong></td>
            </tr>
            <tr>
              <td style="padding: 8px; border: 1px solid #e5e7eb;">Due Date</td>
              <td style="padding: 8px; border: 1px solid #e5e7eb;">${formattedDate}</td>
            </tr>
          </table>
          <div style="margin: 32px 0;">
            <a href="${paymentUrl}"
               style="display: inline-block; background: #16a34a; color: white; padding: 12px 24px;
                      text-decoration: none; border-radius: 6px;">
              Pay Now
            </a>
          </div>
          <p style="color: #6b7280; font-size: 12px;">Sent via Collecta on behalf of ${networkName}</p>
        </div>
      `,
    });
  }

  async sendMemberOtpEmail(
    email: string,
    firstName: string,
    otp: string,
    networkName: string,
  ): Promise<void> {
    await this.sendEmail({
      to: email,
      subject: `Your ${networkName} login code: ${otp}`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Your login code</h2>
          <p>Hi ${firstName},</p>
          <p>Use the code below to sign in to your ${networkName} payment portal. It expires in 15 minutes.</p>
          <div style="margin: 32px 0; text-align: center;">
            <span style="display: inline-block; background: #f3f4f6; border: 1px solid #e5e7eb;
                         border-radius: 8px; padding: 16px 40px; font-size: 36px; font-weight: bold;
                         letter-spacing: 8px; font-family: monospace;">
              ${otp}
            </span>
          </div>
          <p style="color: #6b7280; font-size: 14px;">If you did not request this code, you can safely ignore this email.</p>
          <p style="color: #6b7280; font-size: 12px;">Sent via Collecta on behalf of ${networkName}</p>
        </div>
      `,
    });
  }

  async sendPaymentReceiptEmail(
    email: string,
    firstName: string,
    networkName: string,
    feeName: string,
    amount: number,
    reference: string,
    profileUrl: string,
  ): Promise<void> {
    const formattedAmount = new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
    }).format(amount);

    await this.sendEmail({
      to: email,
      subject: `Payment receipt: ${feeName} — ${formattedAmount}`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Payment Received</h2>
          <p>Hi ${firstName},</p>
          <p>We've confirmed your payment to <strong>${networkName}</strong>. Here are the details:</p>
          <table style="border-collapse: collapse; width: 100%; margin: 16px 0;">
            <tr>
              <td style="padding: 8px; border: 1px solid #e5e7eb;">Description</td>
              <td style="padding: 8px; border: 1px solid #e5e7eb;"><strong>${feeName}</strong></td>
            </tr>
            <tr>
              <td style="padding: 8px; border: 1px solid #e5e7eb;">Amount Paid</td>
              <td style="padding: 8px; border: 1px solid #e5e7eb;"><strong>${formattedAmount}</strong></td>
            </tr>
            <tr>
              <td style="padding: 8px; border: 1px solid #e5e7eb;">Reference</td>
              <td style="padding: 8px; border: 1px solid #e5e7eb; font-family: monospace;">${reference}</td>
            </tr>
          </table>
          <p>You can view all your payments at any time using the link below.</p>
          <div style="margin: 32px 0;">
            <a href="${profileUrl}"
               style="display: inline-block; background: #16a34a; color: white; padding: 12px 24px;
                      text-decoration: none; border-radius: 6px;">
              View My Payment History
            </a>
          </div>
          <p style="color: #6b7280; font-size: 12px;">Or copy this link: ${profileUrl}</p>
          <p style="color: #6b7280; font-size: 12px;">Sent via Collecta on behalf of ${networkName}</p>
        </div>
      `,
    });
  }

  async sendPaymentConfirmationEmail(
    email: string,
    firstName: string,
    networkName: string,
    feeName: string,
    amount: number,
  ): Promise<void> {
    const formattedAmount = new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
    }).format(amount);

    await this.sendEmail({
      to: email,
      subject: `Payment confirmed: ${feeName}`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Payment Confirmed</h2>
          <p>Hi ${firstName},</p>
          <p>Your payment of <strong>${formattedAmount}</strong> for <strong>${feeName}</strong> has been received and confirmed.</p>
          <p>Thank you for staying current with your payments!</p>
          <p style="color: #6b7280; font-size: 12px;">Sent via Collecta on behalf of ${networkName}</p>
        </div>
      `,
    });
  }

  async sendOnboardingTemplates(
    email: string,
    firstName: string,
    networkName: string,
    networkType: string,
    portalUrl: string,
  ): Promise<void> {
    const typeLabel: Record<string, string> = {
      ESTATE: 'estate residents',
      CHAMA: 'chama members',
      SUPPLIER: 'clients',
      DEBT: 'borrowers',
    };

    const noun = typeLabel[networkType] || 'members';

    const whatsappTemplate = `Hi! ${networkName} now uses Collecta to manage payments. You can view your charges and pay online here: ${portalUrl}\n\nNo login needed — just visit the link. Your receipts are digital and permanent.`;
    const smsTemplate = `${networkName}: Pay dues online at ${portalUrl}. View charges, pay securely, get instant receipt.`;

    await this.sendEmail({
      to: email,
      subject: `Your Collecta portal is live — here's how to tell your ${noun}`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #1f2937;">
          <h2 style="color: #16a34a;">Your portal is live, ${firstName}!</h2>
          <p><strong>${networkName}</strong> has been verified. Your payment portal is now active at:</p>
          <p style="background: #f3f4f6; padding: 12px; border-radius: 6px; font-family: monospace; font-size: 14px;">${portalUrl}</p>

          <h3>Share with your ${noun}</h3>
          <p>Copy and send one of these messages — WhatsApp or SMS:</p>

          <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 16px; margin: 12px 0;">
            <p style="font-size: 11px; color: #6b7280; margin: 0 0 8px;">WhatsApp template</p>
            <p style="margin: 0; white-space: pre-wrap; font-size: 14px;">${whatsappTemplate}</p>
          </div>

          <div style="background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 8px; padding: 16px; margin: 12px 0;">
            <p style="font-size: 11px; color: #6b7280; margin: 0 0 8px;">SMS template</p>
            <p style="margin: 0; font-size: 14px;">${smsTemplate}</p>
          </div>

          <p style="color: #6b7280; font-size: 12px; margin-top: 24px;">Collecta — collecta.africa</p>
        </div>
      `,
    });
  }
}
