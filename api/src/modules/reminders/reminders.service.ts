import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import { BlastReminderDto } from './dto/blast-reminder.dto';

@Injectable()
export class RemindersService {
  private readonly logger = new Logger(RemindersService.name);

  constructor(
    private prisma: PrismaService,
    private emailService: EmailService,
    private configService: ConfigService,
  ) {}

  private get frontendUrl() {
    return this.configService.get<string>('app.frontendUrl') || 'https://collecta.africa';
  }

  // ─── Tone Engine ─────────────────────────────────────────────────────────────

  private getTone(daysOverdue: number, paymentType: string): string {
    if (paymentType === 'OPEN') return daysOverdue <= 0 ? 'FRIENDLY' : 'CLEAR';
    if (paymentType === 'WINDOWED') {
      if (daysOverdue < 5) return daysOverdue <= 0 ? 'FRIENDLY' : 'FIRM';
      return 'FORMAL';
    }
    // SCHEDULED (default)
    if (daysOverdue <= -1) return 'FRIENDLY';
    if (daysOverdue === 0) return 'CLEAR';
    if (daysOverdue < 5) return 'FIRM';
    return 'FORMAL';
  }

  // ─── SMS Message Builder ──────────────────────────────────────────────────────

  private buildTonedSmsMessage(
    tone: string,
    member: { firstName: string; lastName: string },
    feeName: string,
    amount: number,
    daysOverdue: number,
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
        const streakSuffix =
          !socialProof ? '' : '';
        const extra = socialProof ? ` ${socialProof}` : streakSuffix;
        msg = `Hi ${name}, your ${feeName} of ${fmt(amount)} is due soon.${extra} Pay: ${payLink}`;
        return msg.length > 160 ? msg.substring(0, 157) + '...' : msg;
      }
      case 'CLEAR':
        msg = `${name}, your ${feeName} of ${fmt(amount)} is due today. Pay now: ${payLink}`;
        return msg.substring(0, 160);
      case 'FIRM': {
        const daysLeft = 5 - daysOverdue;
        const penalty =
          penaltyPercent > 0
            ? ` A ${penaltyPercent}% penalty applies after ${daysLeft} more day${daysLeft === 1 ? '' : 's'}.`
            : '';
        msg = `${name}, your ${feeName} of ${fmt(amount)} is ${daysOverdue} day${daysOverdue === 1 ? '' : 's'} overdue.${penalty} Pay: ${payLink}`;
        return msg.substring(0, 160);
      }
      case 'FORMAL':
        msg = `${name}, your ${feeName} payment of ${fmt(amount)} is ${daysOverdue} days overdue. Your access may be affected. Pay: ${payLink}`;
        return msg.substring(0, 160);
      default:
        return `${name}, please pay your ${feeName} of ${fmt(amount)}. Pay: ${payLink}`;
    }
  }

  // ─── Social Proof / Streak ────────────────────────────────────────────────────

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
      this.logger.error(`Failed to send low-credit warning for network ${network.id}: ${err.message}`);
    }
  }

  // ─── Automated Cron: Every 5 minutes ─────────────────────────────────────────

  @Cron('*/5 * * * *')
  async sendAutomatedReminders() {
    this.logger.log('Running automated reminder job (per-network round-robin)...');

    // Pick the single network with oldest updatedAt that has pending/overdue charges
    const network = await this.prisma.network.findFirst({
      where: {
        isActive: true,
        charges: {
          some: {
            status: { in: ['PENDING', 'OVERDUE'] },
          },
        },
      },
      orderBy: { updatedAt: 'asc' },
    });

    if (!network) {
      this.logger.log('No active networks with pending charges found.');
      return;
    }

    this.logger.log(`Processing reminders for network: ${network.name} (${network.id})`);

    try {
      await this.processNetworkReminders(network);
    } catch (err) {
      this.logger.error(`Failed to process reminders for network ${network.id}: ${err.message}`);
    }

    // Touch updatedAt so this network rotates to the back of the queue
    await this.prisma.network.update({
      where: { id: network.id },
      data: { updatedAt: new Date() },
    });
  }

  private async processNetworkReminders(network: any): Promise<void> {
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0]; // YYYY-MM-DD

    // Count non-guest members for social proof
    const [totalNonGuest, paidThisCycle] = await Promise.all([
      this.prisma.member.count({
        where: { networkId: network.id, isGuest: false, status: 'ACTIVE' },
      }),
      // Count members who have at least one PAID charge for the current month
      this.prisma.member.count({
        where: {
          networkId: network.id,
          isGuest: false,
          status: 'ACTIVE',
          charges: {
            some: {
              status: 'PAID',
              paidAt: {
                gte: new Date(today.getFullYear(), today.getMonth(), 1),
              },
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

    // Find all active FeeAssignments for this network with pending/overdue charges
    const assignments = await this.prisma.feeAssignment.findMany({
      where: {
        isActive: true,
        fee: {
          networkId: network.id,
          isActive: true,
        },
        charges: {
          some: {
            status: { in: ['PENDING', 'OVERDUE'] },
          },
        },
      },
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

    // Reload network to get fresh smsCredits
    let currentNetwork = await this.prisma.network.findUnique({
      where: { id: network.id },
    });
    if (!currentNetwork) return;

    for (const assignment of assignments) {
      const member = assignment.member;
      const fee = assignment.fee;
      const charge = assignment.charges[0];
      if (!charge || !member) continue;

      const dueDate = new Date(charge.dueDate);
      const msPerDay = 24 * 60 * 60 * 1000;
      const daysOverdue = Math.floor(
        (today.setHours(0, 0, 0, 0) - dueDate.setHours(0, 0, 0, 0)) / msPerDay,
      );

      const tone = this.getTone(daysOverdue, fee.paymentType);
      const feeName = fee.name;
      const amount = Number(assignment.amount ?? fee.amount);
      const penaltyPercent = Number(fee.penaltyPercent ?? 0);
      const payLink = `${this.frontendUrl}/n/${currentNetwork!.slug}/pay/${charge.id}`;

      // Streak message (only FRIENDLY, social proof takes priority)
      const streakMsg = this.getStreakMessage(member.consecutiveMonthsPaid);
      const friendlyExtra =
        tone === 'FRIENDLY' ? (socialProofMsg ?? (streakMsg ?? undefined)) : undefined;

      const channels: string[] = ['EMAIL'];
      if (member.phone) channels.push('SMS');

      for (const channel of channels) {
        // Deduplicate: skip if already sent today for this assignment+channel
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

        // SMS credit check
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
              feeName,
              amount,
              new Date(charge.dueDate),
              payLink,
            );
          } else if (channel === 'SMS' && member.phone) {
            const smsMessage = this.buildTonedSmsMessage(
              tone,
              member,
              feeName,
              amount,
              daysOverdue,
              penaltyPercent,
              payLink,
              friendlyExtra,
            );
            await this.sendSms(member.phone, smsMessage);

            // Deduct 1 SMS credit
            await this.prisma.network.update({
              where: { id: network.id },
              data: { smsCredits: { decrement: 1 } },
            });
            currentNetwork = await this.prisma.network.findUnique({
              where: { id: network.id },
            });
          } else {
            continue; // no contact info for this channel
          }

          // Log the reminder
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
    }
  }

  // ─── Manual blast (existing, preserved) ──────────────────────────────────────

  async blastReminders(networkId: string, dto: BlastReminderDto) {
    const network = await this.prisma.network.findUnique({
      where: { id: networkId },
    });

    if (!network) {
      throw new NotFoundException('Network not found');
    }

    // Find all non-paid charges
    const overdueCharges = await this.prisma.charge.findMany({
      where: {
        networkId,
        status: { in: ['PENDING', 'OVERDUE', 'PARTIALLY_PAID'] },
      },
      include: {
        member: true,
        fee: true,
      },
    });

    let sent = 0;
    let failed = 0;

    for (const charge of overdueCharges) {
      if (!charge.member) continue;

      for (const channel of dto.channels) {
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
          this.logger.error(`Failed to send reminder to ${charge.member.email}: ${err.message}`);

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

  async sendToMember(networkId: string, memberId: string, dto: BlastReminderDto) {
    const network = await this.prisma.network.findUnique({
      where: { id: networkId },
    });

    const member = await this.prisma.member.findFirst({
      where: { id: memberId, networkId },
    });

    if (!member) {
      throw new NotFoundException('Member not found');
    }

    const charges = await this.prisma.charge.findMany({
      where: {
        memberId,
        networkId,
        status: { in: ['PENDING', 'OVERDUE', 'PARTIALLY_PAID'] },
      },
      include: { fee: true },
    });

    let sent = 0;

    for (const charge of charges) {
      for (const channel of dto.channels) {
        try {
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
        } catch (err) {
          this.logger.error(err.message);
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

  // ─── Internal send helper (used by blast/sendToMember) ────────────────────────

  private async sendReminder(
    channel: string,
    charge: any,
    network: any,
    customMessage?: string,
  ) {
    const member = charge.member;
    const feeName = charge.fee?.name || charge.description || 'Payment Due';
    const paymentUrl = `${this.frontendUrl}/n/${network.slug}/pay/${charge.id}`;

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
        customMessage || this.buildSmsMessage(member, feeName, Number(charge.amount), paymentUrl),
      );
    } else if (channel === 'WHATSAPP' && member.phone) {
      // WhatsApp via Africa's Talking — same endpoint, different sender
      await this.sendSms(
        member.phone,
        customMessage || this.buildSmsMessage(member, feeName, Number(charge.amount), paymentUrl),
      );
    }
  }

  private buildSmsMessage(
    member: any,
    feeName: string,
    amount: number,
    paymentUrl: string,
  ): string {
    const formattedAmount = `NGN ${amount.toLocaleString()}`;
    return `Hi ${member.firstName}, your payment of ${formattedAmount} for ${feeName} is due. Pay now: ${paymentUrl}`;
  }

  private async sendSms(phone: string, message: string) {
    try {
      const AfricasTalking = require('africastalking');
      const at = AfricasTalking({
        apiKey: this.configService.get<string>('africasTalking.apiKey'),
        username: this.configService.get<string>('africasTalking.username'),
      });

      const sms = at.SMS;
      await sms.send({ to: [phone], message });
    } catch (err) {
      this.logger.error(`Failed to send SMS to ${phone}: ${err.message}`);
      throw err;
    }
  }
}
