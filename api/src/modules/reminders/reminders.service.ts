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
      await this.sendSms(member.phone, customMessage || this.buildSmsMessage(member, feeName, Number(charge.amount), paymentUrl));
    } else if (channel === 'WHATSAPP' && member.phone) {
      // WhatsApp via Africa's Talking — same endpoint, different sender
      await this.sendSms(member.phone, customMessage || this.buildSmsMessage(member, feeName, Number(charge.amount), paymentUrl));
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

  @Cron('0 9 * * *') // 9am daily
  async sendAutomatedReminders() {
    this.logger.log('Running automated reminder job...');

    const networks = await this.prisma.network.findMany({
      where: { isActive: true },
    });

    for (const network of networks) {
      try {
        await this.blastReminders(network.id, { channels: ['EMAIL'] });
      } catch (err) {
        this.logger.error(`Failed to send reminders for network ${network.id}: ${err.message}`);
      }
    }
  }
}
