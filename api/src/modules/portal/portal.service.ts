import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { PaystackService } from '../paystack/paystack.service';
import { EmailService } from '../email/email.service';

@Injectable()
export class PortalService {
  constructor(
    private prisma: PrismaService,
    private paystackService: PaystackService,
    private emailService: EmailService,
    private configService: ConfigService,
  ) {}

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
      },
    });

    if (!network || !network.isActive) {
      throw new NotFoundException('Network not found or inactive');
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

    return { network, openFees };
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

    return {
      member: {
        id: member.id,
        firstName: member.firstName,
        lastName: member.lastName,
        unit: member.unit,
        memberCode: member.memberCode,
        joinedAt: member.joinedAt,
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
    };
  }

  async getCharge(slug: string, chargeId: string) {
    const network = await this.prisma.network.findUnique({
      where: { slug: slug.toLowerCase() },
    });

    if (!network) {
      throw new NotFoundException('Network not found');
    }

    const charge = await this.prisma.charge.findFirst({
      where: { id: chargeId, networkId: network.id },
      include: { fee: { select: { name: true } } },
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
    };
  }

  async initiatePayment(slug: string, chargeId: string, requestedAmount?: number) {
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

    const { authorization_url, reference } = await this.paystackService.createPaymentLink({
      id: charge.id,
      amount: payAmount,
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
    });

    await this.prisma.charge.update({
      where: { id: chargeId },
      data: { paystackPaymentLink: authorization_url, paystackReference: reference },
    });

    return {
      paymentUrl: authorization_url,
      reference,
      charge: {
        id: charge.id,
        amount: payAmount,
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

    const { authorization_url, reference } = await this.paystackService.createPaymentLink({
      id: charge.id,
      amount: payAmount,
      description: fee.name,
      member: { email: payer.email, firstName: member.firstName, lastName: member.lastName },
      network: { paystackSubaccountCode: network.paystackSubaccountCode, name: network.name },
    });

    await this.prisma.charge.update({
      where: { id: charge.id },
      data: { paystackReference: reference },
    });

    return { paymentUrl: authorization_url };
  }

  async verifyPayment(reference: string) {
    // Check if already recorded (idempotent)
    const existing = await this.prisma.payment.findFirst({
      where: { paystackReference: reference },
      include: { charge: { include: { fee: true } } },
    });

    if (existing) {
      return { status: existing.charge.status, alreadyRecorded: true };
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
      const profileUrl = `${frontendUrl}/n/${charge.network.slug}/profile/${charge.member.id}`;
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

    return { status: 'success' };
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
}
