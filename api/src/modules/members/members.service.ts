import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateMemberDto, UpdateMemberDto, ImportMembersDto } from './dto';
import { PaginationDto, paginate } from '../../common/dto';
import { randomUUID } from 'crypto';

@Injectable()
export class MembersService {
  constructor(private prisma: PrismaService) {}

  async findAll(networkId: string, pagination: PaginationDto & { search?: string; status?: string }) {
    const { page = 1, limit = 20, search, status } = pagination;
    const skip = (page - 1) * limit;

    const where: any = { networkId };

    if (status) {
      where.status = status;
    }

    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { memberCode: { contains: search, mode: 'insensitive' } },
        { unit: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [members, total] = await Promise.all([
      this.prisma.member.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          _count: {
            select: { charges: true },
          },
        },
      }),
      this.prisma.member.count({ where }),
    ]);

    // Augment with charge summary
    const membersWithSummary = await Promise.all(
      members.map(async (member) => {
        const [paid, total_charges] = await Promise.all([
          this.prisma.charge.count({ where: { memberId: member.id, status: 'PAID' } }),
          this.prisma.charge.count({ where: { memberId: member.id } }),
        ]);
        return { ...member, chargesSummary: { paid, total: total_charges } };
      }),
    );

    return paginate(membersWithSummary, total, page, limit);
  }

  async findOne(id: string, networkId: string) {
    const member = await this.prisma.member.findFirst({
      where: { id, networkId },
      include: {
        charges: {
          orderBy: { dueDate: 'desc' },
          include: { fee: { select: { id: true, name: true } } },
        },
        payments: {
          orderBy: { createdAt: 'desc' },
        },
        assignments: {
          include: { fee: { select: { id: true, name: true, type: true } } },
        },
      },
    });

    if (!member) {
      throw new NotFoundException('Member not found');
    }

    return member;
  }

  async create(networkId: string, dto: CreateMemberDto) {
    // Check for email uniqueness within network
    if (dto.email) {
      const existing = await this.prisma.member.findFirst({
        where: { networkId, email: dto.email.toLowerCase() },
      });

      if (existing) {
        throw new ConflictException('A member with this email already exists in the network');
      }
    }

    return this.prisma.member.create({
      data: {
        networkId,
        firstName: dto.firstName,
        lastName: dto.lastName,
        email: dto.email?.toLowerCase(),
        phone: dto.phone,
        unit: dto.unit,
        memberCode: dto.memberCode,
      },
    });
  }

  async update(id: string, networkId: string, dto: UpdateMemberDto) {
    const member = await this.prisma.member.findFirst({
      where: { id, networkId },
    });

    if (!member) {
      throw new NotFoundException('Member not found');
    }

    return this.prisma.member.update({
      where: { id },
      data: {
        ...dto,
        email: dto.email?.toLowerCase(),
      },
    });
  }

  async remove(id: string, networkId: string) {
    const member = await this.prisma.member.findFirst({
      where: { id, networkId },
    });

    if (!member) {
      throw new NotFoundException('Member not found');
    }

    await this.prisma.member.delete({ where: { id } });

    return { message: 'Member deleted successfully' };
  }

  async importFromCsv(networkId: string, dto: ImportMembersDto) {
    const lines = dto.csvData.trim().split('\n');

    if (lines.length < 2) {
      throw new BadRequestException('CSV must have a header row and at least one data row');
    }

    const headers = lines[0].split(',').map((h) => h.trim().toLowerCase());
    const requiredHeaders = ['firstname', 'lastname'];

    for (const required of requiredHeaders) {
      if (!headers.includes(required)) {
        throw new BadRequestException(`CSV missing required column: ${required}`);
      }
    }

    const results = { created: 0, skipped: 0, errors: [] as string[] };

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      const values = line.split(',').map((v) => v.trim());
      const row: Record<string, string> = {};

      headers.forEach((header, idx) => {
        row[header] = values[idx] || '';
      });

      try {
        const email = row['email'] ? row['email'].toLowerCase() : undefined;

        if (email) {
          const existing = await this.prisma.member.findFirst({
            where: { networkId, email },
          });

          if (existing) {
            results.skipped++;
            continue;
          }
        }

        await this.prisma.member.create({
          data: {
            networkId,
            firstName: row['firstname'],
            lastName: row['lastname'],
            email: email || null,
            phone: row['phone'] || null,
            unit: row['unit'] || null,
            memberCode: row['membercode'] || null,
          },
        });

        results.created++;
      } catch (err) {
        results.errors.push(`Row ${i}: ${err.message}`);
      }
    }

    return results;
  }

  async generateInviteLink(id: string, networkId: string, appUrl: string) {
    const member = await this.prisma.member.findFirst({
      where: { id, networkId },
      include: { network: true },
    });

    if (!member) {
      throw new NotFoundException('Member not found');
    }

    let token = member.inviteToken;

    if (!token) {
      token = randomUUID();
      await this.prisma.member.update({
        where: { id },
        data: { inviteToken: token },
      });
    }

    return {
      inviteToken: token,
      inviteUrl: `${appUrl}/n/${member.network.slug}/join/${token}`,
    };
  }
}
