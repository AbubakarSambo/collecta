import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PaystackService } from '../paystack/paystack.service';
import { UpdateNetworkDto } from './dto/update-network.dto';

@Injectable()
export class NetworksService {
  constructor(
    private prisma: PrismaService,
    private paystack: PaystackService,
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
      },
    });

    return {
      subaccountCode: result.subaccount_code,
      accountName: verification.account_name,
      settlementBank: bank?.name || null,
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
