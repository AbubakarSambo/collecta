import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PaystackService } from '../paystack/paystack.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { PaginationDto, paginate } from '../../common/dto';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    private prisma: PrismaService,
    private paystackService: PaystackService,
  ) {}

  async findAll(
    networkId: string,
    pagination: PaginationDto & {
      memberId?: string;
      startDate?: string;
      endDate?: string;
    },
  ) {
    const { page = 1, limit = 20, memberId, startDate, endDate } = pagination;
    const skip = (page - 1) * limit;

    const where: any = { networkId };

    if (memberId) {
      where.memberId = memberId;
    }

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate);
    }

    const [payments, total] = await Promise.all([
      this.prisma.payment.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          member: { select: { id: true, firstName: true, lastName: true, unit: true } },
          charge: { include: { fee: { select: { id: true, name: true } } } },
        },
      }),
      this.prisma.payment.count({ where }),
    ]);

    return paginate(payments, total, page, limit);
  }

  async recordPayment(networkId: string, dto: CreatePaymentDto, recordedById?: string) {
    const charge = await this.prisma.charge.findFirst({
      where: { id: dto.chargeId, networkId },
    });

    if (!charge) {
      throw new NotFoundException('Charge not found');
    }

    if (charge.status === 'PAID' || charge.status === 'WAIVED' || charge.status === 'CANCELLED') {
      throw new BadRequestException(`Charge is already ${charge.status.toLowerCase()}`);
    }

    const member = await this.prisma.member.findFirst({
      where: { id: dto.memberId, networkId },
    });

    if (!member) {
      throw new NotFoundException('Member not found');
    }

    const payment = await this.prisma.$transaction(async (tx) => {
      const newPayment = await tx.payment.create({
        data: {
          networkId,
          chargeId: dto.chargeId,
          memberId: dto.memberId,
          amount: dto.amount,
          method: dto.method || 'CASH',
          recordedById,
          metadata: dto.note ? { note: dto.note } : undefined,
        },
      });

      const newPaidAmount = Number(charge.paidAmount) + dto.amount;
      const chargeAmount = Number(charge.amount);
      const newStatus = newPaidAmount >= chargeAmount ? 'PAID' : 'PARTIALLY_PAID';

      await tx.charge.update({
        where: { id: dto.chargeId },
        data: {
          paidAmount: newPaidAmount,
          status: newStatus,
          paidAt: newStatus === 'PAID' ? new Date() : charge.paidAt,
        },
      });

      return newPayment;
    });

    return payment;
  }

  async handlePaystackWebhook(rawBody: Buffer, signature: string) {
    if (!this.paystackService.verifyWebhookSignature(rawBody, signature)) {
      throw new UnauthorizedException('Invalid webhook signature');
    }

    const event = JSON.parse(rawBody.toString());

    if (event.event === 'charge.success') {
      const { reference, metadata } = event.data;

      if (!metadata?.chargeId) {
        this.logger.warn(`Webhook received without chargeId in metadata: ${reference}`);
        return { received: true };
      }

      const charge = await this.prisma.charge.findFirst({
        where: { id: metadata.chargeId },
        include: { network: true },
      });

      if (!charge) {
        this.logger.warn(`Charge not found for chargeId: ${metadata.chargeId}`);
        return { received: true };
      }

      // Check for duplicate
      const existingPayment = await this.prisma.payment.findFirst({
        where: { paystackReference: reference },
      });

      if (existingPayment) {
        return { received: true };
      }

      // Read service charge from the charge record (stored at payment initiation)
      const serviceCharge = charge.serviceCharge ? Number(charge.serviceCharge) : 0;
      // Earn 200 SMS credits per ₦1,000 of service charge
      const creditsEarned = Math.floor((serviceCharge / 1000) * 200);

      await this.prisma.$transaction(async (tx) => {
        const amount = event.data.amount / 100; // Convert from kobo

        await tx.payment.create({
          data: {
            networkId: charge.networkId,
            chargeId: charge.id,
            memberId: charge.memberId,
            amount,
            serviceCharge,
            method: 'PAYSTACK',
            paystackReference: reference,
            metadata: event.data,
          },
        });

        const newPaidAmount = Number(charge.paidAmount) + amount;
        const chargeAmount = Number(charge.amount);
        const newStatus = newPaidAmount >= chargeAmount ? 'PAID' : 'PARTIALLY_PAID';

        await tx.charge.update({
          where: { id: charge.id },
          data: {
            paidAmount: newPaidAmount,
            status: newStatus,
            paystackReference: reference,
            paidAt: newStatus === 'PAID' ? new Date() : charge.paidAt,
          },
        });

        // Award SMS credits to the network based on service charge earned
        if (creditsEarned > 0) {
          await tx.network.update({
            where: { id: charge.networkId },
            data: { smsCredits: { increment: creditsEarned } },
          });
        }
      });

      this.logger.log(
        `Paystack webhook processed for charge ${metadata.chargeId}` +
          (creditsEarned > 0 ? ` — awarded ${creditsEarned} SMS credits` : ''),
      );
    }

    return { received: true };
  }
}
