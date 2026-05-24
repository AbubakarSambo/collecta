import { Injectable, UnauthorizedException } from '@nestjs/common';
import { createHash, randomInt } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';

@Injectable()
export class MemberAuthService {
  constructor(
    private prisma: PrismaService,
    private emailService: EmailService,
  ) {}

  async requestOtp(slug: string, email: string): Promise<{ ok: boolean }> {
    const network = await this.prisma.network.findUnique({
      where: { slug: slug.toLowerCase() },
    });

    if (!network || !network.isActive) {
      // Return ok to avoid revealing whether the network or email exists
      return { ok: true };
    }

    const member = await this.prisma.member.findFirst({
      where: { networkId: network.id, email: email.toLowerCase() },
    });

    if (!member || !member.email) {
      return { ok: true };
    }

    const otp = randomInt(100000, 999999).toString();
    const hash = createHash('sha256').update(otp).digest('hex');
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

    await this.prisma.member.update({
      where: { id: member.id },
      data: { otpHash: hash, otpExpiresAt: expiresAt },
    });

    this.emailService
      .sendMemberOtpEmail(member.email, member.firstName, otp, network.name)
      .catch(() => {});

    return { ok: true };
  }

  async verifyOtp(slug: string, email: string, otp: string) {
    const network = await this.prisma.network.findUnique({
      where: { slug: slug.toLowerCase() },
    });

    if (!network) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const member = await this.prisma.member.findFirst({
      where: { networkId: network.id, email: email.toLowerCase() },
    });

    if (!member || !member.otpHash || !member.otpExpiresAt) {
      throw new UnauthorizedException('Invalid or expired code');
    }

    if (new Date() > member.otpExpiresAt) {
      throw new UnauthorizedException('Code has expired. Please request a new one.');
    }

    const hash = createHash('sha256').update(otp).digest('hex');
    if (hash !== member.otpHash) {
      throw new UnauthorizedException('Invalid code');
    }

    await this.prisma.member.update({
      where: { id: member.id },
      data: { otpHash: null, otpExpiresAt: null },
    });

    return {
      member: {
        id: member.id,
        firstName: member.firstName,
        lastName: member.lastName,
        email: member.email,
        unit: member.unit,
        memberCode: member.memberCode,
        networkSlug: network.slug,
        networkName: network.name,
      },
    };
  }
}
