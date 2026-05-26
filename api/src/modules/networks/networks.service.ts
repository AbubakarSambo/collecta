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
      },
    });

    if (!network) {
      throw new NotFoundException('Network not found');
    }

    return network;
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

    // Send onboarding templates email to admin
    if (network.admin?.email) {
      const portalUrl = `${process.env.FRONTEND_URL || 'https://collecta.africa'}/pay/${network.slug}`;
      this.emailService
        .sendOnboardingTemplates(
          network.admin.email,
          network.admin.firstName,
          network.name,
          network.networkType,
          portalUrl,
        )
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
