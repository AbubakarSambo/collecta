import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { PaystackService } from '../paystack/paystack.service';
import { EmailService } from '../email/email.service';
import { calculateServiceCharge } from '../../common/utils/service-charge.util';

@Injectable()
export class PortalService {
  constructor(
    private prisma: PrismaService,
    private paystackService: PaystackService,
    private emailService: EmailService,
    private configService: ConfigService,
  ) {}

  private getTierTag(consecutiveMonthsPaid: number): { tier: 'TOP' | 'SECOND' | null; label: string | null } {
    if (consecutiveMonthsPaid >= 12) {
      return { tier: 'TOP', label: 'Top Payer — 12+ consecutive months' };
    }
    if (consecutiveMonthsPaid >= 6) {
      const gap = 12 - consecutiveMonthsPaid;
      return { tier: 'SECOND', label: `${consecutiveMonthsPaid} consecutive months — ${gap} away from Top Payer` };
    }
    return { tier: null, label: null };
  }

  async getNetworkPortal(slug: string) {
    const network = await this.prisma.network.findUnique({
      where: { slug: slug.toLowerCase() },
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        logoUrl: true,
        currency: true,
        isActive: true,
        isVerified: true,
        verificationStatus: true,
      },
    });

    if (!network || !network.isActive) {
      throw new NotFoundException('Network not found or inactive');
    }

    if (network.verificationStatus !== 'APPROVED') {
      return {
        comingSoon: true,
        network: { name: network.name, logoUrl: network.logoUrl },
      };
    }

    // Get open fees
    const openFees = await this.prisma.fee.findMany({
      where: { networkId: network.id, type: 'OPEN', isActive: true },
      select: {
        id: true,
        name: true,
        description: true,
        amount: true,
        options: true,
      },
    });

    return {
      comingSoon: false,
      network: {
        id: network.id,
        name: network.name,
        slug: network.slug,
        description: network.description,
        logoUrl: network.logoUrl,
        currency: network.currency,
        isVerified: network.isVerified,
      },
      openFees,
    };
  }

  async getMemberProfile(slug: string, memberId: string) {
    const network = await this.prisma.network.findUnique({
      where: { slug: slug.toLowerCase() },
    });

    if (!network) {
      throw new NotFoundException('Network not found');
    }

    const member = await this.prisma.member.findFirst({
      where: { id: memberId, networkId: network.id },
      include: {
        charges: {
          orderBy: { dueDate: 'desc' },
          include: {
            fee: { select: { id: true, name: true } },
            payments: { select: { id: true, amount: true, method: true, createdAt: true } },
          },
        },
      },
    });

    if (!member) {
      throw new NotFoundException('Member not found');
    }

    const chargesTotal = member.charges.length;
    const chargesPaid = member.charges.filter((c) => c.status === 'PAID').length;
    const chargesOverdue = member.charges.filter((c) => c.status === 'OVERDUE').length;
    const chargesPending = member.charges.filter(
      (c) => c.status === 'PENDING' || c.status === 'PARTIALLY_PAID',
    ).length;
    const compliancePercent =
      chargesTotal > 0 ? Math.round((chargesPaid / chargesTotal) * 100) : 100;

    // Network stats for social proof
    const [totalMembers, membersCurrentWithPayments] = await Promise.all([
      this.prisma.member.count({ where: { networkId: network.id, status: 'ACTIVE' } }),
      this.prisma.member.count({
        where: {
          networkId: network.id,
          status: 'ACTIVE',
          charges: {
            none: { status: { in: ['OVERDUE', 'PENDING', 'PARTIALLY_PAID'] } },
          },
        },
      }),
    ]);

    const motivationalMessage =
      chargesOverdue === 0
        ? 'You are current! No outstanding charges.'
        : chargesOverdue === 1
          ? 'You have 1 overdue charge. Pay now to stay in good standing.'
          : `You have ${chargesOverdue} overdue charges. Please settle them to avoid penalties.`;

    const tierTag = this.getTierTag(member.consecutiveMonthsPaid);

    return {
      member: {
        id: member.id,
        firstName: member.firstName,
        lastName: member.lastName,
        unit: member.unit,
        memberCode: member.memberCode,
        joinedAt: member.joinedAt,
        consecutiveMonthsPaid: member.consecutiveMonthsPaid,
      },
      charges: member.charges,
      summary: {
        chargesTotal,
        chargesPaid,
        chargesOverdue,
        chargesPending,
        compliancePercent,
      },
      networkStats: {
        totalMembers,
        membersCurrentWithPayments,
      },
      motivationalMessage,
      tierTag,
    };
  }

  async getCharge(slug: string, chargeId: string) {
    const network = await this.prisma.network.findUnique({
      where: { slug: slug.toLowerCase() },
      select: { id: true, name: true, isVerified: true, country: true },
    });

    if (!network) {
      throw new NotFoundException('Network not found');
    }

    const charge = await this.prisma.charge.findFirst({
      where: { id: chargeId, networkId: network.id },
      include: {
        fee: { select: { name: true } },
        member: { select: { firstName: true, lastName: true } },
      },
    });

    if (!charge) {
      throw new NotFoundException('Charge not found');
    }

    return {
      id: charge.id,
      feeName: charge.fee?.name || charge.description || 'Charge',
      amount: Number(charge.amount),
      paidAmount: Number(charge.paidAmount),
      remainingAmount: Number(charge.amount) - Number(charge.paidAmount),
      status: charge.status,
      dueDate: charge.dueDate,
      memberName: charge.member
        ? `${charge.member.firstName} ${charge.member.lastName}`
        : null,
      network: {
        name: network.name,
        isVerified: network.isVerified,
        country: network.country || 'NG',
        kenyaEnabled: this.configService.get<boolean>('app.kenyaEnabled') || false,
      },
    };
  }

  async initiatePayment(slug: string, chargeId: string, requestedAmount?: number, paymentMethod?: 'card' | 'bank_transfer' | 'ussd' | 'mobile_money') {
    const network = await this.prisma.network.findUnique({
      where: { slug: slug.toLowerCase() },
    });

    if (!network) {
      throw new NotFoundException('Network not found');
    }

    const charge = await this.prisma.charge.findFirst({
      where: { id: chargeId, networkId: network.id },
      include: {
        member: true,
        fee: true,
      },
    });

    if (!charge) {
      throw new NotFoundException('Charge not found');
    }

    if (charge.status === 'PAID' || charge.status === 'WAIVED' || charge.status === 'CANCELLED') {
      throw new BadRequestException(`Charge is already ${charge.status.toLowerCase()}`);
    }

    const remainingAmount = Number(charge.amount) - Number(charge.paidAmount);

    let payAmount = remainingAmount;
    if (requestedAmount !== undefined) {
      if (requestedAmount <= 0) {
        throw new BadRequestException('Amount must be greater than zero');
      }
      if (requestedAmount > remainingAmount) {
        throw new BadRequestException(`Amount cannot exceed the remaining balance of ${remainingAmount}`);
      }
      payAmount = requestedAmount;
    }

    const serviceCharge = calculateServiceCharge(payAmount);

    const { authorization_url, reference } = await this.paystackService.createPaymentLink({
      id: charge.id,
      amount: payAmount,
      serviceCharge,
      description: charge.description || charge.fee?.name,
      member: {
        email: charge.member.email,
        firstName: charge.member.firstName,
        lastName: charge.member.lastName,
      },
      network: {
        paystackSubaccountCode: network.paystackSubaccountCode,
        name: network.name,
      },
      channels: paymentMethod && paymentMethod !== 'card'
        ? [paymentMethod === 'mobile_money' ? 'mobile_money' : paymentMethod]
        : undefined,
    });

    await this.prisma.charge.update({
      where: { id: chargeId },
      data: {
        paystackPaymentLink: authorization_url,
        paystackReference: reference,
        serviceCharge,
      },
    });

    return {
      paymentUrl: authorization_url,
      reference,
      charge: {
        id: charge.id,
        amount: payAmount,
        serviceCharge,
        total: payAmount + serviceCharge,
        feeName: charge.fee?.name || charge.description,
        memberName: `${charge.member.firstName} ${charge.member.lastName}`,
      },
    };
  }

  async payOpenFee(
    slug: string,
    feeId: string,
    payer: { firstName: string; lastName: string; email: string; amount?: number },
  ) {
    const network = await this.prisma.network.findUnique({
      where: { slug: slug.toLowerCase() },
    });

    if (!network || !network.isActive) {
      throw new NotFoundException('Network not found or inactive');
    }

    const fee = await this.prisma.fee.findFirst({
      where: { id: feeId, networkId: network.id, type: 'OPEN', isActive: true },
    });

    if (!fee) {
      throw new NotFoundException('Fee not found');
    }

    // Find existing member by email or create a guest
    let member = await this.prisma.member.findFirst({
      where: { networkId: network.id, email: payer.email.toLowerCase() },
    });

    if (!member) {
      member = await this.prisma.member.create({
        data: {
          networkId: network.id,
          firstName: payer.firstName,
          lastName: payer.lastName,
          email: payer.email.toLowerCase(),
          isGuest: true,
          status: 'ACTIVE',
        },
      });
    }

    const feeAmount = Number(fee.amount);
    const payAmount = payer.amount ?? feeAmount;

    if (payAmount <= 0 || payAmount > feeAmount) {
      throw new BadRequestException(`Amount must be between 1 and ${feeAmount}`);
    }

    // Create the charge
    const now = new Date();
    const charge = await this.prisma.charge.create({
      data: {
        networkId: network.id,
        memberId: member.id,
        feeId: fee.id,
        amount: fee.amount,
        dueDate: now,
        status: 'PENDING',
        description: fee.name,
      },
    });

    const serviceCharge = calculateServiceCharge(payAmount);

    const { authorization_url, reference } = await this.paystackService.createPaymentLink({
      id: charge.id,
      amount: payAmount,
      serviceCharge,
      description: fee.name,
      member: { email: payer.email, firstName: member.firstName, lastName: member.lastName },
      network: { paystackSubaccountCode: network.paystackSubaccountCode, name: network.name },
    });

    await this.prisma.charge.update({
      where: { id: charge.id },
      data: { paystackReference: reference, serviceCharge },
    });

    return { paymentUrl: authorization_url, serviceCharge, total: payAmount + serviceCharge };
  }

  async verifyPayment(reference: string) {
    // Check if already recorded (idempotent)
    const existing = await this.prisma.payment.findFirst({
      where: { paystackReference: reference },
      include: {
        charge: { include: { fee: true, network: { select: { name: true } } } },
        member: { select: { consecutiveMonthsPaid: true, firstName: true, lastName: true } },
      },
    });

    if (existing) {
      return {
        status: existing.charge.status,
        alreadyRecorded: true,
        tierTag: this.getTierTag(existing.member?.consecutiveMonthsPaid ?? 0),
        feeName: existing.charge.fee?.name || existing.charge.description || 'Payment',
        amount: Number(existing.amount),
        networkName: existing.charge.network?.name,
        memberName: existing.member
          ? `${existing.member.firstName} ${existing.member.lastName}`
          : undefined,
      };
    }

    // Verify with Paystack
    const result = await this.paystackService.verifyPayment(reference);

    if (result.status !== 'success') {
      return { status: 'failed' };
    }

    // Find the charge by paystackReference saved at initiation time
    const charge = await this.prisma.charge.findFirst({
      where: { paystackReference: reference },
      include: {
        member: true,
        network: true,
        fee: { select: { name: true } },
      },
    });

    if (!charge) {
      return { status: 'failed' };
    }

    const amount = result.amount;

    await this.prisma.$transaction(async (tx) => {
      await tx.payment.create({
        data: {
          networkId: charge.networkId,
          chargeId: charge.id,
          memberId: charge.memberId,
          amount,
          method: 'PAYSTACK',
          paystackReference: reference,
          metadata: result.metadata,
        },
      });

      const newPaidAmount = Number(charge.paidAmount) + amount;
      const newStatus = newPaidAmount >= Number(charge.amount) ? 'PAID' : 'PARTIALLY_PAID';

      await tx.charge.update({
        where: { id: charge.id },
        data: {
          paidAmount: newPaidAmount,
          status: newStatus,
          paidAt: newStatus === 'PAID' ? new Date() : charge.paidAt,
        },
      });
    });

    if (charge.member.email) {
      const frontendUrl = this.configService.get<string>('app.frontendUrl') || 'http://localhost:5173';
      const profileUrl = `${frontendUrl}/pay/${charge.network.slug}/profile/${charge.member.id}`;
      const feeName = charge.fee?.name || charge.description || 'Payment';

      this.emailService
        .sendPaymentReceiptEmail(
          charge.member.email,
          charge.member.firstName,
          charge.network.name,
          feeName,
          amount,
          reference,
          profileUrl,
        )
        .catch(() => {});
    }

    const updatedMember = await this.prisma.member.findUnique({
      where: { id: charge.memberId },
      select: { consecutiveMonthsPaid: true },
    });

    const feeName = charge.fee?.name || charge.description || 'Payment';
    const memberName = `${charge.member.firstName} ${charge.member.lastName}`;

    return {
      status: 'success',
      tierTag: this.getTierTag(updatedMember?.consecutiveMonthsPaid ?? 0),
      feeName,
      amount,
      networkName: charge.network.name,
      memberName,
    };
  }

  async getMemberPaymentHistoryByEmail(slug: string, email: string) {
    const network = await this.prisma.network.findUnique({
      where: { slug: slug.toLowerCase() },
      select: { id: true, name: true },
    });

    if (!network) {
      throw new NotFoundException('Network not found');
    }

    const member = await this.prisma.member.findFirst({
      where: { networkId: network.id, email: email.toLowerCase() },
      select: { id: true, firstName: true, lastName: true, consecutiveMonthsPaid: true },
    });

    if (!member) {
      throw new NotFoundException('No account found for that email address');
    }

    const [confirmedPayments, outstandingCharges] = await Promise.all([
      this.prisma.payment.findMany({
        where: { memberId: member.id, networkId: network.id },
        orderBy: { createdAt: 'desc' },
        include: {
          charge: {
            select: { id: true, description: true, fee: { select: { name: true } } },
          },
        },
      }),
      this.prisma.charge.findMany({
        where: {
          memberId: member.id,
          networkId: network.id,
          status: { in: ['PENDING', 'OVERDUE', 'PARTIALLY_PAID'] },
        },
        orderBy: { dueDate: 'asc' },
        select: {
          id: true,
          amount: true,
          paidAmount: true,
          dueDate: true,
          status: true,
          description: true,
          fee: { select: { name: true } },
        },
      }),
    ]);

    return {
      member: { firstName: member.firstName, lastName: member.lastName },
      networkName: network.name,
      confirmedPayments: confirmedPayments.map((p) => ({
        id: p.id,
        amount: Number(p.amount),
        method: p.method,
        reference: p.paystackReference,
        feeName: p.charge?.fee?.name || p.charge?.description || 'Payment',
        paidAt: p.createdAt,
      })),
      outstandingCharges: outstandingCharges.map((c) => ({
        id: c.id,
        feeName: c.fee?.name || c.description || 'Charge',
        amount: Number(c.amount),
        paidAmount: Number(c.paidAmount),
        remainingAmount: Number(c.amount) - Number(c.paidAmount),
        dueDate: c.dueDate,
        status: c.status,
      })),
      tierTag: this.getTierTag(member.consecutiveMonthsPaid),
    };
  }

  async findMemberByEmail(slug: string, email: string) {
    const network = await this.prisma.network.findUnique({
      where: { slug: slug.toLowerCase() },
    });

    if (!network) {
      throw new NotFoundException('Network not found');
    }

    const member = await this.prisma.member.findFirst({
      where: { networkId: network.id, email: email.toLowerCase() },
    });

    if (!member) {
      throw new NotFoundException('No account found for that email address');
    }

    return {
      member: {
        id: member.id,
        firstName: member.firstName,
        lastName: member.lastName,
        unit: member.unit,
        memberCode: member.memberCode,
      },
    };
  }

  async findMemberByToken(slug: string, inviteToken: string) {
    const network = await this.prisma.network.findUnique({
      where: { slug: slug.toLowerCase() },
    });

    if (!network) {
      throw new NotFoundException('Network not found');
    }

    const member = await this.prisma.member.findFirst({
      where: { inviteToken, networkId: network.id },
    });

    if (!member) {
      throw new NotFoundException('Invalid invite token');
    }

    return {
      member: {
        id: member.id,
        firstName: member.firstName,
        lastName: member.lastName,
        email: member.email,
        unit: member.unit,
        memberCode: member.memberCode,
      },
      network: {
        id: network.id,
        name: network.name,
        slug: network.slug,
      },
    };
  }

  async smsOptOut(slug: string, memberId: string) {
    const network = await this.prisma.network.findUnique({
      where: { slug: slug.toLowerCase() },
      select: { id: true },
    });

    if (!network) throw new NotFoundException('Network not found');

    const member = await this.prisma.member.findFirst({
      where: { id: memberId, networkId: network.id },
    });

    if (!member) throw new NotFoundException('Member not found');

    await this.prisma.member.update({
      where: { id: memberId },
      data: { smsOptedOut: true, smsOptedOutAt: new Date() },
    });

    return { message: 'You have been unsubscribed from SMS reminders.' };
  }
}
