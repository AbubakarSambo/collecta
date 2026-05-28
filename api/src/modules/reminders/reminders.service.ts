import {
  Injectable,
  Logger,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import { BlastReminderDto } from './dto/blast-reminder.dto';

const BATCH_SIZE = 500;

@Injectable()
export class RemindersService {
  private readonly logger = new Logger(RemindersService.name);

  constructor(
    private prisma: PrismaService,
    private emailService: EmailService,
    private configService: ConfigService,
  ) {}

  private get frontendUrl() {
    return (
      this.configService.get<string>('app.frontendUrl') || 'https://collecta.services'
    );
  }

  // ─── Tone Engine ──────────────────────────────────────────────────────────────

  private getTone(
    daysFromDue: number,
    paymentType: string,
    daysToWindowClose?: number,
  ): string {
    if (paymentType === 'OPEN') {
      return daysFromDue <= 0 ? 'FRIENDLY' : 'CLEAR';
    }
    if (paymentType === 'WINDOWED') {
      if (daysToWindowClose === undefined) {
        return daysFromDue <= 0 ? 'FRIENDLY' : 'FORMAL';
      }
      if (daysToWindowClose > 7) return 'FRIENDLY';
      if (daysToWindowClose > 0) return 'FIRM';
      return 'FORMAL';
    }
    // SCHEDULED
    if (daysFromDue <= -1) return 'FRIENDLY';
    if (daysFromDue === 0) return 'CLEAR';
    if (daysFromDue < 5) return 'FIRM';
    return 'FORMAL';
  }

  // ─── SMS Message Builder ──────────────────────────────────────────────────────

  private buildTonedSmsMessage(
    tone: string,
    member: { firstName: string; lastName: string },
    feeName: string,
    amount: number,
    daysFromDue: number,
    penaltyPercent: number,
    payLink: string,
    socialProof?: string,
  ): string {
    const name =
      tone === 'FORMAL' ? `${member.firstName} ${member.lastName}` : member.firstName;
    const fmt = (n: number) => `NGN ${n.toLocaleString('en-NG')}`;
    let msg: string;

    switch (tone) {
      case 'FRIENDLY': {
        const extra = socialProof ? ` ${socialProof}` : '';
        msg = `Hi ${name}, your ${feeName} of ${fmt(amount)} is due soon.${extra} Pay: ${payLink}`;
        return msg.length > 160 ? msg.substring(0, 157) + '...' : msg;
      }
      case 'CLEAR':
        msg = `${name}, your ${feeName} of ${fmt(amount)} is due today. Pay now: ${payLink}`;
        return msg.substring(0, 160);
      case 'FIRM': {
        const daysLeft = 5 - daysFromDue;
        const penalty =
          penaltyPercent > 0
            ? ` A ${penaltyPercent}% penalty applies after ${daysLeft} more day${daysLeft === 1 ? '' : 's'}.`
            : '';
        msg = `${name}, your ${feeName} of ${fmt(amount)} is ${daysFromDue} day${daysFromDue === 1 ? '' : 's'} overdue.${penalty} Pay: ${payLink}`;
        return msg.substring(0, 160);
      }
      case 'FORMAL':
        msg = `${name}, your ${feeName} payment of ${fmt(amount)} is ${daysFromDue} days overdue. Your access may be affected. Pay: ${payLink}`;
        return msg.substring(0, 160);
      default:
        return `${name}, please pay your ${feeName} of ${fmt(amount)}. Pay: ${payLink}`;
    }
  }

  // ─── Social Proof ─────────────────────────────────────────────────────────────

  private getSocialProofMessage(
    paidCount: number,
    total: number,
    networkType: string,
  ): string | undefined {
    if (networkType === 'DEBT') return undefined;
    if (paidCount >= 5 && paidCount / total >= 0.5) {
      return `${paidCount} of ${total} members have already paid.`;
    }
    return undefined;
  }

  private getStreakMessage(consecutiveMonthsPaid: number): string | undefined {
    if (consecutiveMonthsPaid >= 2) return 'Thanks for your consistent payments!';
    return undefined;
  }

  // ─── Low-Credit Warning ───────────────────────────────────────────────────────

  private async maybeSendLowCreditWarning(network: any): Promise<void> {
    if (network.smsCredits > 0) return;
    const now = new Date();
    const lastSent = network.smsWarningLastSentAt
      ? new Date(network.smsWarningLastSentAt)
      : null;
    if (lastSent && now.getTime() - lastSent.getTime() < 24 * 60 * 60 * 1000) return;

    try {
      const admin = await this.prisma.user.findUnique({
        where: { id: network.adminId },
        select: { email: true, firstName: true },
      });
      if (admin?.email) {
        await this.emailService.sendFeeReminderEmail(
          admin.email,
          admin.firstName,
          network.name,
          'SMS Credits Exhausted',
          0,
          new Date(),
          `${this.frontendUrl}/dashboard/settings`,
          `Your network "${network.name}" has run out of SMS credits. Automated SMS reminders have been paused. Please top up your credits to resume.`,
        );
      }
      await this.prisma.network.update({
        where: { id: network.id },
        data: { smsWarningLastSentAt: now },
      });
    } catch (err) {
      this.logger.error(
        `Failed to send low-credit warning for network ${network.id}: ${err.message}`,
      );
    }
  }

  // ─── Automated Cron ───────────────────────────────────────────────────────────

  @Cron('*/5 * * * *')
  async sendAutomatedReminders() {
    this.logger.log('Running automated reminder job...');

    const network = await this.prisma.network.findFirst({
      where: {
        isActive: true,
        reminderRules: { some: { isActive: true } },
      },
      orderBy: { lastRunAt: 'asc' },
      include: { reminderRules: { where: { isActive: true } } },
    });

    if (!network || network.reminderRules.length === 0) {
      this.logger.log('No active networks with configured reminder rules.');
      return;
    }

    this.logger.log(
      `Processing reminders for: ${network.name} (cursor: ${network.lastProcessedId ?? 'start'})`,
    );

    try {
      await this.processNetworkBatch(network);
    } catch (err) {
      this.logger.error(
        `Failed to process reminders for network ${network.id}: ${err.message}`,
      );
    }
  }

  private async processNetworkBatch(network: any): Promise<void> {
    const today = new Date();
    const todayMidnight = new Date(today);
    todayMidnight.setHours(0, 0, 0, 0);
    const todayStr = todayMidnight.toISOString().split('T')[0];
    const msPerDay = 24 * 60 * 60 * 1000;

    // Social proof counts
    const [totalNonGuest, paidThisCycle] = await Promise.all([
      this.prisma.member.count({
        where: { networkId: network.id, isGuest: false, status: 'ACTIVE' },
      }),
      this.prisma.member.count({
        where: {
          networkId: network.id,
          isGuest: false,
          status: 'ACTIVE',
          charges: {
            some: {
              status: 'PAID',
              paidAt: { gte: new Date(today.getFullYear(), today.getMonth(), 1) },
            },
          },
        },
      }),
    ]);
    const socialProofMsg = this.getSocialProofMessage(
      paidThisCycle,
      totalNonGuest,
      network.networkType,
    );

    // Fetch batch of assignments from cursor
    const assignments = await this.prisma.feeAssignment.findMany({
      where: {
        isActive: true,
        fee: { networkId: network.id, isActive: true },
        member: { isGuest: false, status: 'ACTIVE' },
        charges: { some: { status: { in: ['PENDING', 'OVERDUE'] } } },
        ...(network.lastProcessedId ? { id: { gt: network.lastProcessedId } } : {}),
      },
      orderBy: { id: 'asc' },
      take: BATCH_SIZE,
      include: {
        fee: true,
        member: true,
        charges: {
          where: { status: { in: ['PENDING', 'OVERDUE'] } },
          orderBy: { dueDate: 'asc' },
          take: 1,
        },
      },
    });

    let currentNetwork = await this.prisma.network.findUnique({
      where: { id: network.id },
    });
    if (!currentNetwork) return;

    for (const assignment of assignments) {
      const member = assignment.member;
      const fee = assignment.fee;
      const charge = assignment.charges[0];
      if (!charge || !member) continue;

      // Skip OPEN fees past their window
      if (
        fee.paymentType === 'OPEN' &&
        fee.windowEnd &&
        new Date(fee.windowEnd) < today
      ) {
        continue;
      }

      const dueDate = new Date(charge.dueDate);
      dueDate.setHours(0, 0, 0, 0);
      const daysFromDue = Math.round(
        (todayMidnight.getTime() - dueDate.getTime()) / msPerDay,
      );

      // Check if any configured rule matches today's offset
      const matchingRules = network.reminderRules.filter(
        (r: any) => r.daysOffset === daysFromDue,
      );
      if (matchingRules.length === 0) continue;

      let daysToWindowClose: number | undefined;
      if (fee.paymentType === 'WINDOWED' && fee.windowEnd) {
        const windowEnd = new Date(fee.windowEnd);
        windowEnd.setHours(0, 0, 0, 0);
        daysToWindowClose = Math.ceil(
          (windowEnd.getTime() - todayMidnight.getTime()) / msPerDay,
        );
      }

      const tone = this.getTone(daysFromDue, fee.paymentType, daysToWindowClose);
      const amount = Number(assignment.amount ?? fee.amount);
      const penaltyPercent = Number(fee.penaltyPercent ?? 0);
      const payLink = `${this.frontendUrl}/pay/${currentNetwork!.slug}/pay/${charge.id}`;

      const streakMsg = this.getStreakMessage(member.consecutiveMonthsPaid);
      const friendlyExtra =
        tone === 'FRIENDLY' ? (socialProofMsg ?? streakMsg ?? undefined) : undefined;

      // Collect all channels from matching rules (deduplicated)
      const channels = [
        ...new Set(matchingRules.flatMap((r: any) => r.channels as string[])),
      ];

      for (const channel of channels) {
        if (channel === 'SMS' && member.smsOptedOut) continue;
        if (channel === 'SMS' && !member.phone) continue;
        if (channel === 'EMAIL' && !member.email) continue;

        // Dedup: only send once per assignment+day+channel
        const existing = await this.prisma.reminderLog.findUnique({
          where: {
            assignmentId_sentDate_channel: {
              assignmentId: assignment.id,
              sentDate: todayStr,
              channel: channel as any,
            },
          },
        });
        if (existing) continue;

        if (channel === 'SMS') {
          currentNetwork = await this.prisma.network.findUnique({
            where: { id: network.id },
          });
          if (!currentNetwork || currentNetwork.smsCredits <= 0) {
            await this.maybeSendLowCreditWarning(currentNetwork ?? network);
            continue;
          }
        }

        try {
          if (channel === 'EMAIL' && member.email) {
            await this.emailService.sendFeeReminderEmail(
              member.email,
              member.firstName,
              currentNetwork!.name,
              fee.name,
              amount,
              new Date(charge.dueDate),
              payLink,
              friendlyExtra,
              tone as 'FRIENDLY' | 'CLEAR' | 'FIRM' | 'FORMAL',
            );
          } else if (channel === 'SMS' && member.phone) {
            const smsMessage = this.buildTonedSmsMessage(
              tone,
              member,
              fee.name,
              amount,
              daysFromDue,
              penaltyPercent,
              payLink,
              friendlyExtra,
            );
            await this.sendSms(member.phone, smsMessage);
            await this.prisma.network.update({
              where: { id: network.id },
              data: { smsCredits: { decrement: 1 } },
            });
            currentNetwork = await this.prisma.network.findUnique({
              where: { id: network.id },
            });
          } else {
            continue;
          }

          await this.prisma.reminderLog.create({
            data: {
              networkId: network.id,
              memberId: member.id,
              assignmentId: assignment.id,
              chargeId: charge.id,
              channel: channel as any,
              tone: tone as any,
              sentDate: todayStr,
            },
          });
        } catch (err) {
          this.logger.error(
            `Failed to send ${channel} reminder for assignment ${assignment.id}: ${err.message}`,
          );
        }
      }

      // Advance cursor after each assignment
      await this.prisma.network.update({
        where: { id: network.id },
        data: { lastProcessedId: assignment.id },
      });
    }

    // Batch complete — if fewer than BATCH_SIZE returned we've finished this network
    if (assignments.length < BATCH_SIZE) {
      await this.prisma.network.update({
        where: { id: network.id },
        data: { lastRunAt: today, lastProcessedId: null },
      });
      this.logger.log(`Finished processing network: ${network.name}`);
    }
  }

  // ─── Reminder Rules CRUD ──────────────────────────────────────────────────────

  async getRules(networkId: string) {
    return this.prisma.reminderRule.findMany({
      where: { networkId, isActive: true },
      orderBy: { daysOffset: 'asc' },
    });
  }

  async createRule(
    networkId: string,
    daysOffset: number,
    channels: string[],
  ) {
    const existing = await this.prisma.reminderRule.findUnique({
      where: { networkId_daysOffset: { networkId, daysOffset } },
    });
    if (existing) {
      if (existing.isActive) {
        throw new ConflictException(
          'A reminder rule for that trigger day already exists.',
        );
      }
      // Re-activate and update channels if previously soft-deleted
      return this.prisma.reminderRule.update({
        where: { id: existing.id },
        data: { isActive: true, channels },
      });
    }
    return this.prisma.reminderRule.create({
      data: { networkId, daysOffset, channels },
    });
  }

  async deleteRule(networkId: string, ruleId: string) {
    await this.prisma.reminderRule.updateMany({
      where: { id: ruleId, networkId },
      data: { isActive: false },
    });
    return { success: true };
  }

  // ─── Manual Blast ─────────────────────────────────────────────────────────────

  async estimateBlast(networkId: string, channels: string[]) {
    const network = await this.prisma.network.findUnique({
      where: { id: networkId },
      select: { smsCredits: true },
    });
    if (!network) throw new NotFoundException('Network not found');

    const recipientCount = await this.prisma.charge.count({
      where: {
        networkId,
        status: { in: ['PENDING', 'OVERDUE', 'PARTIALLY_PAID'] },
        member: { isGuest: false },
      },
    });

    const needsSms = channels.includes('SMS');
    const creditsRequired = needsSms ? recipientCount : 0;
    const creditsAvailable = network.smsCredits;
    const canAfford = !needsSms || creditsAvailable >= creditsRequired;
    const creditsAfter = needsSms
      ? creditsAvailable - creditsRequired
      : creditsAvailable;

    return { recipientCount, creditsRequired, creditsAvailable, creditsAfter, canAfford };
  }

  async blastReminders(networkId: string, dto: BlastReminderDto) {
    const network = await this.prisma.network.findUnique({
      where: { id: networkId },
    });
    if (!network) throw new NotFoundException('Network not found');

    if (dto.channels.includes('SMS')) {
      const recipientCount = await this.prisma.charge.count({
        where: {
          networkId,
          status: { in: ['PENDING', 'OVERDUE', 'PARTIALLY_PAID'] },
          member: { isGuest: false },
        },
      });
      if (network.smsCredits < recipientCount) {
        return {
          sent: 0,
          failed: 0,
          total: recipientCount,
          reason: `Insufficient SMS credits. You need ${recipientCount} but have ${network.smsCredits}. Purchase more in Settings.`,
        };
      }
    }

    const overdueCharges = await this.prisma.charge.findMany({
      where: {
        networkId,
        status: { in: ['PENDING', 'OVERDUE', 'PARTIALLY_PAID'] },
      },
      include: { member: true, fee: true },
    });

    let sent = 0;
    let failed = 0;

    for (const charge of overdueCharges) {
      if (!charge.member) continue;
      for (const channel of dto.channels) {
        if (channel === 'SMS' && (charge.member as any).smsOptedOut) continue;
        try {
          await this.sendReminder(channel, charge, network, dto.message);
          await this.prisma.reminder.create({
            data: {
              networkId,
              memberId: charge.memberId,
              chargeId: charge.id,
              channel,
              status: 'SENT',
              message: dto.message,
              sentAt: new Date(),
            },
          });
          sent++;
        } catch (err) {
          this.logger.error(
            `Failed to send reminder to ${charge.member.email}: ${err.message}`,
          );
          await this.prisma.reminder.create({
            data: {
              networkId,
              memberId: charge.memberId,
              chargeId: charge.id,
              channel,
              status: 'FAILED',
              message: dto.message,
            },
          });
          failed++;
        }
      }
    }

    return { sent, failed, total: overdueCharges.length };
  }

  async sendToMember(
    networkId: string,
    memberId: string,
    dto: BlastReminderDto,
  ) {
    const network = await this.prisma.network.findUnique({
      where: { id: networkId },
    });
    const member = await this.prisma.member.findFirst({
      where: { id: memberId, networkId },
    });
    if (!member) throw new NotFoundException('Member not found');

    const charges = await this.prisma.charge.findMany({
      where: {
        memberId,
        networkId,
        status: { in: ['PENDING', 'OVERDUE', 'PARTIALLY_PAID'] },
      },
      include: { fee: true },
    });

    this.logger.log(
      `sendToMember: memberId=${memberId} charges=${charges.length} channels=${dto.channels.join(',')} phone=${member.phone || 'none'} email=${member.email || 'none'}`,
    );

    if (charges.length === 0) {
      this.logger.warn(`sendToMember: no unpaid charges found for member ${memberId} — nothing to send`);
      return { sent: 0, member: `${member.firstName} ${member.lastName}` };
    }

    let sent = 0;
    for (const charge of charges) {
      for (const channel of dto.channels) {
        try {
          this.logger.log(`sendToMember: sending ${channel} for charge ${charge.id}`);
          await this.sendReminder(channel, { ...charge, member }, network, dto.message);
          await this.prisma.reminder.create({
            data: {
              networkId,
              memberId,
              chargeId: charge.id,
              channel,
              status: 'SENT',
              message: dto.message,
              sentAt: new Date(),
            },
          });
          sent++;
          this.logger.log(`sendToMember: ${channel} sent OK for charge ${charge.id}`);
        } catch (err) {
          this.logger.error(`sendToMember: ${channel} failed for charge ${charge.id}: ${err.message}`);
        }
      }
    }

    return { sent, member: `${member.firstName} ${member.lastName}` };
  }

  async getReminderHistory(networkId: string) {
    return this.prisma.reminder.findMany({
      where: { networkId },
      orderBy: { createdAt: 'desc' },
      take: 100,
      include: {
        member: { select: { id: true, firstName: true, lastName: true } },
        charge: { select: { id: true, amount: true, dueDate: true } },
      },
    });
  }

  // ─── Internal Helpers ─────────────────────────────────────────────────────────

  private async sendReminder(
    channel: string,
    charge: any,
    network: any,
    customMessage?: string,
  ) {
    const member = charge.member;
    const feeName = charge.fee?.name || charge.description || 'Payment Due';
    const paymentUrl = `${this.frontendUrl}/pay/${network.slug}/pay/${charge.id}`;

    if (channel === 'EMAIL' && member.email) {
      await this.emailService.sendFeeReminderEmail(
        member.email,
        member.firstName,
        network.name,
        feeName,
        Number(charge.amount),
        charge.dueDate,
        paymentUrl,
        customMessage,
      );
    } else if (channel === 'SMS' && member.phone) {
      await this.sendSms(
        member.phone,
        customMessage ||
          `Hi ${member.firstName}, your payment of NGN ${Number(charge.amount).toLocaleString()} for ${feeName} is due. Pay now: ${paymentUrl}`,
      );
    } else if (channel === 'WHATSAPP' && member.phone) {
      await this.sendSms(
        member.phone,
        customMessage ||
          `Hi ${member.firstName}, your payment of NGN ${Number(charge.amount).toLocaleString()} for ${feeName} is due. Pay now: ${paymentUrl}`,
      );
    }
  }

  private async sendSms(phone: string, message: string) {
    const username = this.configService.get<string>('africasTalking.username');
    const apiKey = this.configService.get<string>('africasTalking.apiKey');
    this.logger.log(`sendSms: to=${phone} username=${username} apiKeySet=${!!apiKey}`);
    try {
      const AfricasTalking = require('africastalking');
      const at = AfricasTalking({ apiKey, username });
      const result = await at.SMS.send({ to: [phone], message });
      const recipient = result?.SMSMessageData?.Recipients?.[0];
      if (recipient && recipient.statusCode !== 101) {
        this.logger.warn(`sendSms: AT rejected ${phone} — status=${recipient.status} (${recipient.statusCode})`);
        throw new Error(`AT delivery failed: ${recipient.status}`);
      }
      this.logger.log(`sendSms: delivered to ${phone}`);
    } catch (err) {
      this.logger.error(`Failed to send SMS to ${phone}: ${err.message}`);
      throw err;
    }
  }
}
