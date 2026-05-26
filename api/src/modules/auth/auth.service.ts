import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import { RegisterDto, LoginDto, ForgotPasswordDto, ResetPasswordDto } from './dto';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService,
    private emailService: EmailService,
  ) {}

  async register(dto: RegisterDto) {
    // Check email uniqueness
    const existingUser = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
    });

    if (existingUser) {
      throw new ConflictException('Email already registered');
    }

    // Check slug uniqueness
    const existingNetwork = await this.prisma.network.findUnique({
      where: { slug: dto.networkSlug.toLowerCase() },
    });

    if (existingNetwork) {
      throw new ConflictException('Network slug is already taken. Please choose another.');
    }

    const passwordHash = await bcrypt.hash(dto.password, 12);

    const result = await this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email: dto.email.toLowerCase(),
          password: passwordHash,
          firstName: dto.firstName,
          lastName: dto.lastName,
          role: 'NETWORK_ADMIN',
          isEmailVerified: false,
        },
      });

      const network = await tx.network.create({
        data: {
          name: dto.networkName,
          slug: dto.networkSlug.toLowerCase(),
          description: dto.networkDescription,
          adminId: user.id,
          networkType: dto.networkType ?? 'ESTATE',
        },
      });

      const token = crypto.randomBytes(32).toString('hex');
      await tx.emailVerificationToken.create({
        data: {
          userId: user.id,
          token,
          type: 'EMAIL_VERIFICATION',
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        },
      });

      return { user, network, token };
    });

    // Send verification email (fire and forget)
    this.emailService
      .sendVerificationEmail(result.user.email, result.user.firstName, result.token)
      .catch((err) =>
        this.logger.error(`Failed to send verification email: ${err.message}`),
      );

    return {
      message: 'Registration successful. Please check your email to verify your account.',
      email: result.user.email,
    };
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
      include: { network: true },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    if (!user.isEmailVerified) {
      throw new UnauthorizedException('Please verify your email before logging in');
    }

    if (!user.password) {
      throw new UnauthorizedException('No password set for this account');
    }

    const isPasswordValid = await bcrypt.compare(dto.password, user.password);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const accessToken = this.generateToken(user);

    return {
      accessToken,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        networkId: user.network?.id ?? null,
        networkName: user.network?.name ?? null,
        networkSlug: user.network?.slug ?? null,
        isPlatformAdmin: user.isPlatformAdmin,
      },
    };
  }

  async verifyEmail(token: string) {
    const tokenRecord = await this.prisma.emailVerificationToken.findUnique({
      where: { token },
      include: { user: { include: { network: true } } },
    });

    if (!tokenRecord) {
      throw new BadRequestException('Invalid verification token');
    }

    if (tokenRecord.usedAt) {
      throw new BadRequestException('This token has already been used');
    }

    if (tokenRecord.expiresAt < new Date()) {
      throw new BadRequestException('This verification link has expired. Please request a new one.');
    }

    if (tokenRecord.type !== 'EMAIL_VERIFICATION') {
      throw new BadRequestException('Invalid token type');
    }

    const user = await this.prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: tokenRecord.userId },
        data: { isEmailVerified: true },
      });

      await tx.emailVerificationToken.update({
        where: { id: tokenRecord.id },
        data: { usedAt: new Date() },
      });

      return tokenRecord.user;
    });

    const accessToken = this.generateToken(user);

    return {
      accessToken,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        networkId: user.network?.id ?? null,
        networkName: user.network?.name ?? null,
        networkSlug: user.network?.slug ?? null,
        isPlatformAdmin: user.isPlatformAdmin,
      },
    };
  }

  async forgotPassword(dto: ForgotPasswordDto): Promise<{ message: string }> {
    const message = 'If an account with that email exists, a password reset link has been sent.';

    const user = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
    });

    if (!user) {
      return { message };
    }

    // Invalidate existing PASSWORD_RESET tokens
    await this.prisma.emailVerificationToken.updateMany({
      where: { userId: user.id, type: 'PASSWORD_RESET', usedAt: null },
      data: { usedAt: new Date() },
    });

    const token = crypto.randomBytes(32).toString('hex');
    await this.prisma.emailVerificationToken.create({
      data: {
        userId: user.id,
        token,
        type: 'PASSWORD_RESET',
        expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
      },
    });

    this.emailService
      .sendPasswordResetEmail(user.email, user.firstName, token)
      .catch((err) =>
        this.logger.error(`Failed to send password reset email: ${err.message}`),
      );

    return { message };
  }

  async resetPassword(dto: ResetPasswordDto) {
    const tokenRecord = await this.prisma.emailVerificationToken.findUnique({
      where: { token: dto.token },
      include: { user: { include: { network: true } } },
    });

    if (!tokenRecord) {
      throw new BadRequestException('Invalid or expired reset link');
    }

    if (tokenRecord.usedAt) {
      throw new BadRequestException('This reset link has already been used');
    }

    if (tokenRecord.expiresAt < new Date()) {
      throw new BadRequestException('This reset link has expired. Please request a new one.');
    }

    if (tokenRecord.type !== 'PASSWORD_RESET') {
      throw new BadRequestException('Invalid token type');
    }

    const passwordHash = await bcrypt.hash(dto.password, 12);

    const user = await this.prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: tokenRecord.userId },
        data: { password: passwordHash },
      });

      await tx.emailVerificationToken.update({
        where: { id: tokenRecord.id },
        data: { usedAt: new Date() },
      });

      return tokenRecord.user;
    });

    const accessToken = this.generateToken(user);

    return {
      accessToken,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        networkId: user.network?.id ?? null,
        networkName: user.network?.name ?? null,
        networkSlug: user.network?.slug ?? null,
        isPlatformAdmin: user.isPlatformAdmin,
      },
    };
  }

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { network: true },
    });

    if (!user) {
      throw new BadRequestException('User not found');
    }

    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      isPlatformAdmin: user.isPlatformAdmin,
      isEmailVerified: user.isEmailVerified,
      network: user.network
        ? {
            id: user.network.id,
            name: user.network.name,
            slug: user.network.slug,
            logoUrl: user.network.logoUrl,
            currency: user.network.currency,
            timezone: user.network.timezone,
          }
        : null,
    };
  }

  async bootstrapPlatformAdmin(data: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
  }) {
    const existing = await this.prisma.user.findFirst({ where: { isPlatformAdmin: true } });
    if (existing) {
      throw new ConflictException('A platform admin already exists');
    }

    const passwordHash = await bcrypt.hash(data.password, 12);
    const user = await this.prisma.user.create({
      data: {
        email: data.email.toLowerCase(),
        password: passwordHash,
        firstName: data.firstName,
        lastName: data.lastName,
        role: 'SUPER_ADMIN',
        isPlatformAdmin: true,
        isEmailVerified: true,
      },
    });

    return { message: 'Platform admin created', email: user.email };
  }

  private generateToken(user: { id: string; email: string; network?: { id: string } | null; role: string }) {
    const payload = {
      sub: user.id,
      email: user.email,
      networkId: user.network?.id ?? null,
      role: user.role,
    };

    return this.jwtService.sign(payload);
  }
}
