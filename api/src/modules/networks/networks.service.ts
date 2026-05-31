import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PaystackService } from '../paystack/paystack.service';
import { EmailService } from '../email/email.service';
import { UpdateNetworkDto } from './dto/update-network.dto';
import { SubmitVerificationDto } from './dto/submit-verification.dto';
import {
  calculateServiceCharge,
  calculateTotalAmount,
} from '../../common/utils/service-charge.util';

const SMS_BUNDLES: Record<number, number> = {
  100: 600,
  500: 3000,
  1000: 6000,
  5000: 28500,
};

const STARTER_SMS_CREDITS = 50;

@Injectable()
export class NetworksService {
  constructor(
    private prisma: PrismaService,
    private paystack: PaystackService,
    private emailService: EmailService,
  ) {}

  async findByAdmin(adminId: string) {
    const network = await this.prisma.network.findUnique({
      where: { adminId },
      include: {
        _count: {
          select: { members: true, fees: true, charges: true },
        },
        verificationRequest: { select: { id: true } },
      },
    });

    if (!network) {
      throw new NotFoundException('Network not found');
    }

    const { verificationRequest, ...rest } = network;
    return { ...rest, hasSubmittedVerification: !!verificationRequest };
  }

  async update(adminId: string, dto: UpdateNetworkDto) {
    const network = await this.prisma.network.findUnique({
      where: { adminId },
    });

    if (!network) {
      throw new NotFoundException('Network not found');
    }

    return this.prisma.network.update({
      where: { id: network.id },
      data: dto,
    });
  }

  async getPaystackStatus(adminId: string) {
    const network = await this.prisma.network.findUnique({
      where: { adminId },
      select: {
        paystackSubaccountCode: true,
        bankAccountName: true,
        settlementBank: true,
      },
    });

    if (!network) throw new NotFoundException('Network not found');

    return {
      isSetup: !!network.paystackSubaccountCode,
      bankAccountName: network.bankAccountName,
      settlementBank: network.settlementBank,
    };
  }

  async setupPaystack(adminId: string, bankCode: string, accountNumber: string) {
    const network = await this.prisma.network.findUnique({ where: { adminId } });

    if (!network) throw new NotFoundException('Network not found');

    // Verify the account first
    const verification = await this.paystack.verifyBankAccount(accountNumber, bankCode);

    // Get bank name from the banks list
    const banks = await this.paystack.listBanks();
    const bank = banks.find((b) => b.code === bankCode);

    // Create the Paystack subaccount
    const result = await this.paystack.createSubaccount({
      businessName: network.name,
      bankCode,
      accountNumber,
    });

    await this.prisma.network.update({
      where: { id: network.id },
      data: {
        paystackSubaccountCode: result.subaccount_code,
        paystackSubaccountId: String(result.id),
        bankCode,
        bankAccountNumber: accountNumber,
        bankAccountName: verification.account_name,
        settlementBank: bank?.name || null,
        // Grant 50 starter SMS credits when bank is connected AND network is already verified
        ...(network.isVerified
          ? { smsCredits: { increment: STARTER_SMS_CREDITS } }
          : {}),
      },
    });

    // If already verified, now both conditions are met — send the onboarding email
    if (network.isVerified) {
      const portalUrl = `${process.env.FRONTEND_URL || 'https://collecta.services'}/pay/${network.slug}`;
      const admin = await this.prisma.user.findUnique({
        where: { id: network.adminId },
        select: { email: true, firstName: true },
      });
      if (admin?.email) {
        this.emailService
          .sendOnboardingTemplates(admin.email, admin.firstName, network.name, network.networkType, portalUrl)
          .catch(() => {});
      }
    }

    return {
      subaccountCode: result.subaccount_code,
      accountName: verification.account_name,
      settlementBank: bank?.name || null,
    };
  }

  getServiceChargeBreakdown(amountNaira: number): {
    amount: number;
    serviceCharge: number;
    total: number;
  } {
    const serviceCharge = calculateServiceCharge(amountNaira);
    const total = calculateTotalAmount(amountNaira);
    return { amount: amountNaira, serviceCharge, total };
  }

  async submitVerification(adminId: string, dto: SubmitVerificationDto) {
    const network = await this.prisma.network.findUnique({ where: { adminId } });

    if (!network) throw new NotFoundException('Network not found');

    // Upsert VerificationRequest with submitted details
    await this.prisma.verificationRequest.upsert({
      where: { networkId: network.id },
      create: {
        networkId: network.id,
        organisationName: dto.organisationName,
        cacNumber: dto.cacNumber,
        bvn: dto.bvn,
        nin: dto.nin,
        contactAddress: dto.contactAddress,
        status: 'PENDING',
      },
      update: {
        organisationName: dto.organisationName,
        cacNumber: dto.cacNumber,
        bvn: dto.bvn,
        nin: dto.nin,
        contactAddress: dto.contactAddress,
        status: 'PENDING',
        rejectionReason: null,
      },
    });

    return this.prisma.network.update({
      where: { id: network.id },
      data: { verificationStatus: 'PENDING' },
    });
  }

  async approveVerification(networkId: string) {
    const network = await this.prisma.network.findUnique({
      where: { id: networkId },
      include: { admin: { select: { email: true, firstName: true } } },
    });

    if (!network) throw new NotFoundException('Network not found');

    const grantCredits = !!network.paystackSubaccountCode;

    const [updatedNetwork] = await Promise.all([
      this.prisma.network.update({
        where: { id: networkId },
        data: {
          isVerified: true,
          verificationStatus: 'APPROVED',
          ...(grantCredits ? { smsCredits: { increment: STARTER_SMS_CREDITS } } : {}),
        },
      }),
      this.prisma.verificationRequest.updateMany({
        where: { networkId },
        data: { status: 'APPROVED' },
      }),
    ]);

    // Send onboarding email — only if bank account is also connected
    if (network.admin?.email && network.paystackSubaccountCode) {
      const portalUrl = `${process.env.FRONTEND_URL || 'https://collecta.services'}/pay/${network.slug}`;
      this.emailService
        .sendOnboardingTemplates(
          network.admin.email,
          network.admin.firstName,
          network.name,
          network.networkType,
          portalUrl,
        )
        .catch(() => {});
    } else if (network.admin?.email && !network.paystackSubaccountCode) {
      this.emailService
        .sendEmail({
          to: network.admin.email,
          subject: `${network.name} is verified — one step left`,
          html: `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
              <h2>Your organisation is verified, ${network.admin.firstName}!</h2>
              <p><strong>${network.name}</strong> has been verified by Collecta.</p>
              <p>To go live and start accepting payments, connect a bank account in your settings.</p>
              <div style="margin: 32px 0;">
                <a href="${process.env.FRONTEND_URL || 'https://collecta.services'}/settings?tab=paystack"
                   style="display: inline-block; background: #16a34a; color: white; padding: 12px 24px;
                          text-decoration: none; border-radius: 6px; font-weight: 600;">
                  Connect bank account
                </a>
              </div>
              <p style="color: #6b7280; font-size: 12px;">Collecta — collecta.services</p>
            </div>
          `,
        })
        .catch(() => {});
    }

    return updatedNetwork;
  }

  async rejectVerification(networkId: string, reason: string) {
    const network = await this.prisma.network.findUnique({ where: { id: networkId } });

    if (!network) throw new NotFoundException('Network not found');

    const [updatedNetwork] = await Promise.all([
      this.prisma.network.update({
        where: { id: networkId },
        data: { verificationStatus: 'REJECTED', verificationNotes: reason },
      }),
      this.prisma.verificationRequest.updateMany({
        where: { networkId },
        data: { status: 'REJECTED', rejectionReason: reason },
      }),
    ]);

    return updatedNetwork;
  }

  async getSmsCredits(adminId: string): Promise<{ credits: number }> {
    const network = await this.prisma.network.findUnique({
      where: { adminId },
      select: { smsCredits: true },
    });

    if (!network) throw new NotFoundException('Network not found');

    return { credits: network.smsCredits };
  }

  async topUpSmsCredits(adminId: string, bundle: number) {
    const price = SMS_BUNDLES[bundle];

    if (!price) {
      throw new BadRequestException(
        `Invalid bundle. Valid bundles are: ${Object.keys(SMS_BUNDLES).join(', ')}`,
      );
    }

    const network = await this.prisma.network.findUnique({ where: { adminId } });

    if (!network) throw new NotFoundException('Network not found');

    const updated = await this.prisma.network.update({
      where: { id: network.id },
      data: { smsCredits: { increment: bundle } },
      select: { smsCredits: true },
    });

    return {
      credits: updated.smsCredits,
      added: bundle,
      price,
    };
  }

  async getMonitoringSignals() {
    const approvedNetworks = await this.prisma.network.findMany({
      where: { verificationStatus: 'APPROVED' },
      select: {
        id: true,
        name: true,
        slug: true,
        networkType: true,
        createdAt: true,
        updatedAt: true,
        adminId: true,
        _count: { select: { members: true, fees: true } },
        fees: { select: { amount: true }, take: 10 },
        members: {
          select: { createdAt: true },
          orderBy: { createdAt: 'asc' },
          take: 200,
        },
      },
    });

    // Thresholds per org type (max reasonable fee amount in Naira)
    const FEE_THRESHOLDS: Record<string, number> = {
      ESTATE: 500_000,
      CHAMA: 200_000,
      SUPPLIER: 5_000_000,
      DEBT: 10_000_000,
    };

    const signals: Array<{
      networkId: string;
      networkName: string;
      slug: string;
      signal: string;
      detail: string;
    }> = [];

    for (const network of approvedNetworks) {
      // Signal 1: fee amount unusually high for org type
      const threshold = FEE_THRESHOLDS[network.networkType] ?? 500_000;
      for (const fee of network.fees) {
        if (Number(fee.amount) > threshold) {
          signals.push({
            networkId: network.id,
            networkName: network.name,
            slug: network.slug,
            signal: 'HIGH_FEE_AMOUNT',
            detail: `Fee of ₦${Number(fee.amount).toLocaleString()} exceeds expected ceiling for ${network.networkType}`,
          });
          break; // one signal per network
        }
      }

      // Signal 2: member count growing very rapidly (>50 members added within 24 hours of approval)
      if (network.members.length >= 50) {
        const firstMemberTime = new Date(network.members[0].createdAt).getTime();
        const fiftiethMemberTime = new Date(network.members[49].createdAt).getTime();
        const hoursToFifty = (fiftiethMemberTime - firstMemberTime) / (1000 * 60 * 60);
        if (hoursToFifty < 24) {
          signals.push({
            networkId: network.id,
            networkName: network.name,
            slug: network.slug,
            signal: 'RAPID_MEMBER_GROWTH',
            detail: `50 members added in ${Math.round(hoursToFifty)} hours`,
          });
        }
      }
    }

    // Signal 3: same admin with multiple networks (admin can only have one network via unique constraint,
    // but flag admins who created multiple networks across different accounts sharing same name pattern)
    // Simple: list any admin with >1 network (schema prevents this, so this wonits useful here)

    return { signals, checkedAt: new Date() };
  }

  async getPlatformStats() {
    const [totalNetworks, approvedNetworks, pendingVerifications, totalMembers, paymentsAgg] =
      await Promise.all([
        this.prisma.network.count(),
        this.prisma.network.count({ where: { verificationStatus: 'APPROVED' } }),
        this.prisma.verificationRequest.count({ where: { status: 'PENDING' } }),
        this.prisma.member.count(),
        this.prisma.payment.aggregate({ _sum: { amount: true }, _count: { _all: true } }),
      ]);

    return {
      totalNetworks,
      approvedNetworks,
      pendingVerifications,
      totalMembers,
      totalPaymentsCount: paymentsAgg._count._all,
      totalPaymentsVolume: Number(paymentsAgg._sum.amount ?? 0),
    };
  }

  async getAllNetworks(page: number = 1, search?: string) {
    const where: any = search
      ? {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { slug: { contains: search, mode: 'insensitive' } },
            { admin: { email: { contains: search, mode: 'insensitive' } } },
          ],
        }
      : {};

    const [networks, total] = await Promise.all([
      this.prisma.network.findMany({
        where,
        include: {
          admin: { select: { email: true, firstName: true, lastName: true } },
          _count: { select: { members: true, fees: true, payments: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * 20,
        take: 20,
      }),
      this.prisma.network.count({ where }),
    ]);

    return {
      data: networks,
      meta: { total, page, totalPages: Math.ceil(total / 20) },
    };
  }

  async getPendingVerifications() {
    return this.prisma.verificationRequest.findMany({
      where: { status: 'PENDING' },
      include: {
        network: {
          include: {
            admin: { select: { email: true, firstName: true, lastName: true } },
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async findBySlug(slug: string) {
    const network = await this.prisma.network.findUnique({
      where: { slug: slug.toLowerCase() },
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        logoUrl: true,
        currency: true,
        timezone: true,
        isActive: true,
        _count: {
          select: { members: true },
        },
      },
    });

    if (!network) {
      throw new NotFoundException('Network not found');
    }

    return network;
  }
}
