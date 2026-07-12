import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { CreateMemberDto, UpdateMemberDto, ImportMembersDto } from './dto';
import { PaginationDto, paginate } from '../../common/dto';
import { randomUUID } from 'crypto';

@Injectable()
export class MembersService {
  constructor(private prisma: PrismaService) {}

  async findAll(networkId: string, pagination: PaginationDto & { search?: string; status?: string; ghost?: boolean }) {
    const { page = 1, limit = 20, search, status, ghost } = pagination;
    const skip = (page - 1) * limit;

    const where: any = { networkId };

    if (status) {
      where.status = status;
    }

    if (ghost === true) {
      const ninetyDaysAgo = new Date();
      ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
      where.status = 'ACTIVE';
      where.joinedAt = { lte: ninetyDaysAgo };
      where.AND = [
        { charges: { some: {} } },
        { charges: { none: { status: 'PAID' } } },
      ];
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
        whatsappOptedIn: dto.whatsappOptedIn ?? false,
        whatsappOptedInAt: dto.whatsappOptedIn ? new Date() : undefined,
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

    const data: Record<string, unknown> = {
      ...dto,
      email: dto.email?.toLowerCase(),
    };

    // Track the opt-in/opt-out transition the same way the portal self-service endpoints do,
    // so admin-set consent and member-set consent both leave an audit timestamp.
    if (dto.whatsappOptedIn === true && !member.whatsappOptedIn) {
      data.whatsappOptedInAt = new Date();
      data.whatsappOptedOutAt = null;
    } else if (dto.whatsappOptedIn === false && member.whatsappOptedIn) {
      data.whatsappOptedOutAt = new Date();
    }

    return this.prisma.member.update({
      where: { id },
      data,
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

    const dataRows: Record<string, string>[] = [];
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      const values = line.split(',').map((v) => v.trim());
      const row: Record<string, string> = {};
      headers.forEach((header, idx) => {
        row[header] = values[idx] || '';
      });
      dataRows.push(row);
    }

    const job = await this.prisma.importJob.create({
      data: {
        networkId,
        status: 'QUEUED',
        rawData: dataRows as any,
        totalRows: dataRows.length,
      },
    });

    return { jobId: job.id, totalRows: dataRows.length };
  }

  async getImportJobStatus(networkId: string, jobId: string) {
    const job = await this.prisma.importJob.findFirst({
      where: { id: jobId, networkId },
      select: {
        id: true,
        status: true,
        totalRows: true,
        processedRows: true,
        createdCount: true,
        skippedCount: true,
        errors: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!job) throw new NotFoundException('Import job not found');

    return job;
  }

  @Cron('*/2 * * * *')
  async processImportJobs() {
    const job = await this.prisma.importJob.findFirst({
      where: { status: 'QUEUED' },
      orderBy: { createdAt: 'asc' },
    });

    if (!job) return;

    await this.prisma.importJob.update({
      where: { id: job.id },
      data: { status: 'PROCESSING' },
    });

    const rows = (job.rawData as Record<string, string>[]) || [];
    const errors: string[] = [];
    let created = 0;
    let skipped = 0;

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      try {
        const email = row['email'] ? row['email'].toLowerCase() : undefined;

        if (email) {
          const existing = await this.prisma.member.findFirst({
            where: { networkId: job.networkId, email },
          });
          if (existing) {
            skipped++;
            continue;
          }
        }

        const whatsappOptedIn = this.parseCsvBoolean(row['whatsappoptin']);

        await this.prisma.member.create({
          data: {
            networkId: job.networkId,
            firstName: row['firstname'],
            lastName: row['lastname'],
            email: email || null,
            phone: row['phone'] || null,
            unit: row['unit'] || null,
            memberCode: row['membercode'] || null,
            whatsappOptedIn,
            whatsappOptedInAt: whatsappOptedIn ? new Date() : null,
          },
        });

        created++;
      } catch (err) {
        errors.push(`Row ${i + 1}: ${err.message}`);
      }

      if ((i + 1) % 50 === 0) {
        await this.prisma.importJob.update({
          where: { id: job.id },
          data: { processedRows: i + 1, createdCount: created, skippedCount: skipped },
        });
      }
    }

    await this.prisma.importJob.update({
      where: { id: job.id },
      data: {
        status: errors.length === rows.length && rows.length > 0 ? 'FAILED' : 'DONE',
        processedRows: rows.length,
        createdCount: created,
        skippedCount: skipped,
        errors: errors as any,
        rawData: null,
      },
    });
  }

  private parseCsvBoolean(value?: string): boolean {
    if (!value) return false;
    return ['yes', 'y', 'true', '1'].includes(value.trim().toLowerCase());
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
      inviteUrl: `${appUrl}/pay/${member.network.slug}/join/${token}`,
    };
  }
}
