import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { PaystackService } from '../paystack/paystack.service';
import { EmailService } from '../email/email.service';
import { calculateServiceCharge } from '../../common/utils/service-charge.util';
import {
  buildStreakCalendar,
  computeBenchmark,
  daysEarly,
  Benchmark,
  StreakDot,
} from './portal-stats.util';

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

  /** Counts of active members and how many are fully current (social proof). */
  private async getNetworkStats(networkId: string): Promise<{ totalMembers: number; membersCurrentWithPayments: number }> {
    const [totalMembers, membersCurrentWithPayments] = await Promise.all([
      this.prisma.member.count({ where: { networkId, status: 'ACTIVE' } }),
      this.prisma.member.count({
        where: {
          networkId,
          status: 'ACTIVE',
          charges: { none: { status: { in: ['OVERDUE', 'PENDING', 'PARTIALLY_PAID'] } } },
        },
      }),
    ]);
    return { totalMembers, membersCurrentWithPayments };
  }

  /** Per-month paid/missed/upcoming dots for a member's last 18 months. */
  private async getMemberStreakCalendar(networkId: string, memberId: string): Promise<StreakDot[]> {
    const charges = await this.prisma.charge.findMany({
      where: { networkId, memberId },
      select: { billingMonth: true, dueDate: true, status: true, paidAt: true },
    });
    return buildStreakCalendar(charges);
  }

  /** Peer benchmark: how early this member pays vs the network (last 12 months). */
  private async getMemberBenchmark(networkId: string, memberId: string): Promise<Benchmark> {
    const since = new Date();
    since.setMonth(since.getMonth() - 12);
    const payments = await this.prisma.payment.findMany({
      where: { networkId, createdAt: { gte: since } },
      select: { memberId: true, createdAt: true, charge: { select: { dueDate: true } } },
    });
    const networkDaysEarly: number[] = [];
    const memberDaysEarly: number[] = [];
    for (const p of payments) {
      if (!p.charge?.dueDate) continue;
      const de = daysEarly(p.charge.dueDate, p.createdAt);
      networkDaysEarly.push(de);
      if (p.memberId === memberId) memberDaysEarly.push(de);
    }
    return computeBenchmark(memberDaysEarly, networkDaysEarly);
  }

  async getNetworkBenchmark(slug: string, memberId: string) {
    const network = await this.prisma.network.findUnique({
      where: { slug: slug.toLowerCase() },
      select: { id: true },
    });
    if (!network) {
      throw new NotFoundException('Network not found');
    }
    return this.getMemberBenchmark(network.id, memberId);
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
        paystackSubaccountCode: true,
        contactPhone: true,
      },
    });

    if (!network || !network.isActive) {
      throw new NotFoundException('Network not found or inactive');
    }

    if (network.verificationStatus !== 'APPROVED') {
      return {
        comingSoon: true,
        reason: 'pending_verification',
        network: { name: network.name, logoUrl: network.logoUrl },
      };
    }

    if (!network.paystackSubaccountCode) {
      return {
        comingSoon: true,
        reason: 'no_bank_account',
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

    const networkStats = await this.getNetworkStats(network.id);

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
        contactPhone: network.contactPhone,
      },
      openFees,
      networkStats,
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
    const streakCalendar = buildStreakCalendar(member.charges);
    const benchmark = await this.getMemberBenchmark(network.id, member.id);

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
      streakCalendar,
      benchmark,
      motivationalMessage,
      tierTag,
    };
  }

  async getCharge(slug: string, chargeId: string) {
    const network = await this.prisma.network.findUnique({
      where: { slug: slug.toLowerCase() },
      select: { id: true, name: true, isVerified: true, country: true, bankAccountName: true, settlementBank: true, contactPhone: true },
    });

    if (!network) {
      throw new NotFoundException('Network not found');
    }

    const charge = await this.prisma.charge.findFirst({
      where: { id: chargeId, networkId: network.id },
      include: {
        fee: { select: { name: true } },
        member: { select: { id: true, firstName: true, lastName: true, consecutiveMonthsPaid: true } },
      },
    });

    if (!charge) {
      throw new NotFoundException('Charge not found');
    }

    const consecutiveMonthsPaid = charge.member?.consecutiveMonthsPaid ?? 0;

    return {
      id: charge.id,
      feeName: charge.fee?.name || charge.description || 'Charge',
      amount: Number(charge.amount),
      paidAmount: Number(charge.paidAmount),
      remainingAmount: Number(charge.amount) - Number(charge.paidAmount),
      status: charge.status,
      dueDate: charge.dueDate,
      memberId: charge.member?.id ?? null,
      memberName: charge.member
        ? `${charge.member.firstName} ${charge.member.lastName}`
        : null,
      consecutiveMonthsPaid,
      tierTag: this.getTierTag(consecutiveMonthsPaid),
      network: {
        name: network.name,
        isVerified: network.isVerified,
        country: network.country || 'NG',
        kenyaEnabled: this.configService.get<boolean>('app.kenyaEnabled') || false,
        bankAccountName: network.bankAccountName,
        settlementBank: network.settlementBank,
        contactPhone: network.contactPhone,
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

    if (!network.paystackSubaccountCode) {
      throw new BadRequestException(
        'This network has not connected a bank account. Payments cannot be processed until a bank account is set up.',
      );
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

    if (!network.paystackSubaccountCode) {
      throw new BadRequestException(
        'This network has not connected a bank account. Payments cannot be processed until a bank account is set up.',
      );
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
        charge: { include: { fee: true, network: { select: { name: true, slug: true } } } },
        member: { select: { consecutiveMonthsPaid: true, firstName: true, lastName: true } },
      },
    });

    if (existing) {
      const existingOutstanding = await this.prisma.charge.findMany({
        where: {
          memberId: existing.memberId,
          networkId: existing.networkId,
          status: { in: ['PENDING', 'OVERDUE', 'PARTIALLY_PAID'] },
          id: { not: existing.chargeId },
        },
        orderBy: { dueDate: 'asc' },
        take: 3,
        select: {
          id: true,
          amount: true,
          paidAmount: true,
          dueDate: true,
          status: true,
          description: true,
          fee: { select: { name: true } },
        },
      });

      const [streakCalendar, benchmark] = await Promise.all([
        this.getMemberStreakCalendar(existing.networkId, existing.memberId),
        this.getMemberBenchmark(existing.networkId, existing.memberId),
      ]);

      return {
        status: existing.charge.status,
        alreadyRecorded: true,
        tierTag: this.getTierTag(existing.member?.consecutiveMonthsPaid ?? 0),
        feeName: existing.charge.fee?.name || existing.charge.description || 'Payment',
        amount: Number(existing.amount),
        networkName: existing.charge.network?.name,
        networkSlug: existing.charge.network?.slug,
        memberId: existing.memberId,
        memberName: existing.member
          ? `${existing.member.firstName} ${existing.member.lastName}`
          : undefined,
        streakCalendar,
        benchmark,
        outstandingCharges: existingOutstanding.map((c) => ({
          id: c.id,
          feeName: c.fee?.name || c.description || 'Charge',
          amount: Number(c.amount) - Number(c.paidAmount),
          dueDate: c.dueDate,
          status: c.status,
        })),
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

    const [streakCalendar, benchmark] = await Promise.all([
      this.getMemberStreakCalendar(charge.networkId, charge.memberId),
      this.getMemberBenchmark(charge.networkId, charge.memberId),
    ]);

    // Fetch remaining outstanding charges for directional step on confirmation screen
    const outstandingCharges = await this.prisma.charge.findMany({
      where: {
        memberId: charge.memberId,
        networkId: charge.networkId,
        status: { in: ['PENDING', 'OVERDUE', 'PARTIALLY_PAID'] },
        id: { not: charge.id },
      },
      orderBy: { dueDate: 'asc' },
      take: 3,
      select: {
        id: true,
        amount: true,
        paidAmount: true,
        dueDate: true,
        status: true,
        description: true,
        fee: { select: { name: true } },
      },
    });

    return {
      status: 'success',
      tierTag: this.getTierTag(updatedMember?.consecutiveMonthsPaid ?? 0),
      feeName,
      amount,
      networkName: charge.network.name,
      networkSlug: charge.network.slug,
      memberId: charge.memberId,
      memberName,
      streakCalendar,
      benchmark,
      outstandingCharges: outstandingCharges.map((c) => ({
        id: c.id,
        feeName: c.fee?.name || c.description || 'Charge',
        amount: Number(c.amount) - Number(c.paidAmount),
        dueDate: c.dueDate,
        status: c.status,
      })),
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

    // Aggregate cross-organisation figures (counts/totals only — see privacy note).
    // We never expose *which* other organisations a person belongs to.
    const sameEmailMembers = await this.prisma.member.findMany({
      where: { email: email.toLowerCase() },
      select: { id: true, networkId: true },
    });
    const organisationsCount = new Set(sameEmailMembers.map((m) => m.networkId)).size;
    const crossOrgAgg = await this.prisma.payment.aggregate({
      where: { memberId: { in: sameEmailMembers.map((m) => m.id) } },
      _sum: { amount: true },
    });
    const crossOrgLifetimeTotal = Number(crossOrgAgg._sum.amount ?? 0);
    const lifetimeTotal = confirmedPayments.reduce((sum, p) => sum + Number(p.amount), 0);

    return {
      member: { firstName: member.firstName, lastName: member.lastName },
      networkName: network.name,
      stats: {
        lifetimeTotal,
        consecutiveMonthsPaid: member.consecutiveMonthsPaid,
        organisationsCount,
        crossOrgLifetimeTotal,
      },
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
