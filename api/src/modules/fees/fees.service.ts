import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import { CreateFeeDto, UpdateFeeDto, AssignFeeDto } from './dto';
import { PaginationDto, paginate } from '../../common/dto';
import { ChargesService } from '../charges/charges.service';

@Injectable()
export class FeesService {
  constructor(
    private prisma: PrismaService,
    private chargesService: ChargesService,
    private emailService: EmailService,
    private configService: ConfigService,
  ) {}

  async findAll(networkId: string, pagination: PaginationDto) {
    const { page = 1, limit = 20 } = pagination;
    const skip = (page - 1) * limit;

    const [fees, total] = await Promise.all([
      this.prisma.fee.findMany({
        where: { networkId },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          _count: {
            select: { assignments: true, charges: true },
          },
        },
      }),
      this.prisma.fee.count({ where: { networkId } }),
    ]);

    return paginate(fees, total, page, limit);
  }

  async findOne(id: string, networkId: string) {
    const fee = await this.prisma.fee.findFirst({
      where: { id, networkId },
      include: {
        assignments: {
          include: {
            member: {
              select: { id: true, firstName: true, lastName: true, unit: true, email: true },
            },
          },
        },
        _count: {
          select: { charges: true },
        },
      },
    });

    if (!fee) {
      throw new NotFoundException('Fee not found');
    }

    return fee;
  }

  async create(networkId: string, dto: CreateFeeDto) {
    return this.prisma.fee.create({
      data: {
        networkId,
        name: dto.name,
        description: dto.description,
        type: dto.type,
        amount: dto.amount,
        frequency: dto.frequency || 'MONTHLY',
        dueDay: dto.dueDay || 1,
        penaltyEnabled: dto.penaltyEnabled || false,
        penaltyPercent: dto.penaltyPercent || 0,
        penaltyGraceDays: dto.penaltyGraceDays || 7,
        options: dto.options,
      },
    });
  }

  async update(id: string, networkId: string, dto: UpdateFeeDto) {
    const fee = await this.prisma.fee.findFirst({ where: { id, networkId } });

    if (!fee) {
      throw new NotFoundException('Fee not found');
    }

    return this.prisma.fee.update({ where: { id }, data: dto });
  }

  async remove(id: string, networkId: string) {
    const fee = await this.prisma.fee.findFirst({ where: { id, networkId } });

    if (!fee) {
      throw new NotFoundException('Fee not found');
    }

    await this.prisma.fee.delete({ where: { id } });

    return { message: 'Fee deleted successfully' };
  }

  async assignToMembers(feeId: string, networkId: string, dto: AssignFeeDto) {
    const [fee, network] = await Promise.all([
      this.prisma.fee.findFirst({ where: { id: feeId, networkId } }),
      this.prisma.network.findUnique({ where: { id: networkId }, select: { name: true, slug: true } }),
    ]);

    if (!fee) {
      throw new NotFoundException('Fee not found');
    }

    const frontendUrl = this.configService.get<string>('app.frontendUrl') || 'https://collecta.africa';
    const results = { assigned: 0, skipped: 0 };

    for (const memberId of dto.memberIds) {
      const member = await this.prisma.member.findFirst({
        where: { id: memberId, networkId },
      });

      if (!member) {
        results.skipped++;
        continue;
      }

      const existing = await this.prisma.feeAssignment.findUnique({
        where: { feeId_memberId: { feeId, memberId } },
      });

      if (existing) {
        if (!existing.isActive) {
          await this.prisma.feeAssignment.update({
            where: { id: existing.id },
            data: { isActive: true, amount: dto.amount ?? null },
          });
          const charge = await this.chargesService.generateChargeForAssignment(existing.id);
          if (charge && member.email) {
            this.emailService
              .sendFeeAssignmentEmail(
                member.email,
                member.firstName,
                network.name,
                fee.name,
                Number(charge.amount),
                charge.dueDate,
                `${frontendUrl}/n/${network.slug}/pay/${charge.id}`,
              )
              .catch(() => {});
          }
          results.assigned++;
        } else {
          results.skipped++;
        }
        continue;
      }

      const assignment = await this.prisma.feeAssignment.create({
        data: {
          feeId,
          memberId,
          amount: dto.amount ?? null,
          isActive: true,
        },
      });

      const charge = await this.chargesService.generateChargeForAssignment(assignment.id);
      if (charge && member.email) {
        this.emailService
          .sendFeeAssignmentEmail(
            member.email,
            member.firstName,
            network.name,
            fee.name,
            Number(charge.amount),
            charge.dueDate,
            `${frontendUrl}/n/${network.slug}/pay/${charge.id}`,
          )
          .catch(() => {});
      }
      results.assigned++;
    }

    return results;
  }

  async removeAssignment(feeId: string, memberId: string, networkId: string) {
    const fee = await this.prisma.fee.findFirst({ where: { id: feeId, networkId } });

    if (!fee) {
      throw new NotFoundException('Fee not found');
    }

    const assignment = await this.prisma.feeAssignment.findUnique({
      where: { feeId_memberId: { feeId, memberId } },
    });

    if (!assignment) {
      throw new NotFoundException('Assignment not found');
    }

    await this.prisma.feeAssignment.update({
      where: { id: assignment.id },
      data: { isActive: false, endDate: new Date() },
    });

    return { message: 'Assignment removed' };
  }
}
