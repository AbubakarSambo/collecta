import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { CreateChargeDto } from './dto/create-charge.dto';
import { PaginationDto, paginate } from '../../common/dto';

@Injectable()
export class ChargesService {
  private readonly logger = new Logger(ChargesService.name);

  constructor(private prisma: PrismaService) {}

  async findAll(
    networkId: string,
    pagination: PaginationDto & {
      status?: string;
      memberId?: string;
      feeId?: string;
    },
  ) {
    const { page = 1, limit = 20, status, memberId, feeId } = pagination;
    const skip = (page - 1) * limit;

    const where: any = { networkId };

    if (status) {
      where.status = status;
    }

    if (memberId) {
      where.memberId = memberId;
    }

    if (feeId) {
      where.feeId = feeId;
    }

    const [charges, total] = await Promise.all([
      this.prisma.charge.findMany({
        where,
        skip,
        take: limit,
        orderBy: { dueDate: 'desc' },
        include: {
          member: { select: { id: true, firstName: true, lastName: true, unit: true } },
          fee: { select: { id: true, name: true } },
        },
      }),
      this.prisma.charge.count({ where }),
    ]);

    return paginate(charges, total, page, limit);
  }

  async create(networkId: string, dto: CreateChargeDto) {
    // Validate member belongs to network
    const member = await this.prisma.member.findFirst({
      where: { id: dto.memberId, networkId },
    });

    if (!member) {
      throw new NotFoundException('Member not found in this network');
    }

    return this.prisma.charge.create({
      data: {
        networkId,
        memberId: dto.memberId,
        feeId: dto.feeId,
        amount: dto.amount,
        dueDate: new Date(dto.dueDate),
        description: dto.description,
        status: 'PENDING',
      },
      include: {
        member: { select: { id: true, firstName: true, lastName: true } },
        fee: { select: { id: true, name: true } },
      },
    });
  }

  async waive(id: string, networkId: string) {
    const charge = await this.prisma.charge.findFirst({
      where: { id, networkId },
    });

    if (!charge) {
      throw new NotFoundException('Charge not found');
    }

    return this.prisma.charge.update({
      where: { id },
      data: { status: 'WAIVED' },
    });
  }

  async getSummary(networkId: string) {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    const [
      totalMembers,
      pendingCharges,
      overdueCharges,
      collectedThisMonth,
      ghostMemberCount,
      overdueChargesForPattern,
    ] = await Promise.all([
      this.prisma.member.count({ where: { networkId, status: 'ACTIVE' } }),
      this.prisma.charge.aggregate({
        where: { networkId, status: 'PENDING' },
        _sum: { amount: true },
        _count: true,
      }),
      this.prisma.charge.aggregate({
        where: { networkId, status: 'OVERDUE' },
        _sum: { amount: true },
        _count: true,
      }),
      this.prisma.payment.aggregate({
        where: {
          networkId,
          createdAt: { gte: startOfMonth, lte: endOfMonth },
        },
        _sum: { amount: true },
      }),
      this.prisma.member.count({
        where: {
          networkId,
          status: 'ACTIVE',
          joinedAt: { lte: ninetyDaysAgo },
          AND: [
            { charges: { some: {} } },
            { charges: { none: { status: 'PAID' } } },
          ],
        },
      }),
      // Fetch overdue charges to compute persistent non-payers (2+ distinct billing months)
      this.prisma.charge.findMany({
        where: { networkId, status: 'OVERDUE' },
        select: { memberId: true, billingMonth: true, dueDate: true },
      }),
    ]);

    // Persistent non-payer: member with OVERDUE charges across 2+ distinct billing months
    const memberOverdueMonths: Record<string, Set<string>> = {};
    for (const c of overdueChargesForPattern) {
      if (!memberOverdueMonths[c.memberId]) memberOverdueMonths[c.memberId] = new Set();
      const monthKey = c.billingMonth || new Date(c.dueDate).toISOString().slice(0, 7);
      memberOverdueMonths[c.memberId].add(monthKey);
    }
    const persistentNonPayerCount = Object.values(memberOverdueMonths).filter(
      (months) => months.size >= 2,
    ).length;

    return {
      totalMembers,
      pendingChargesAmount: pendingCharges._sum.amount || 0,
      pendingChargesCount: pendingCharges._count,
      overdueChargesAmount: overdueCharges._sum.amount || 0,
      overdueChargesCount: overdueCharges._count,
      collectedThisMonth: collectedThisMonth._sum.amount || 0,
      ghostMemberCount,
      persistentNonPayerCount,
    };
  }

  // ─── Charge Generation ──────────────────────────────────────────────────────

  private getPeriodBounds(
    frequency: string,
    dueDay: number,
    now: Date,
  ): { dueDate: Date; periodStart: Date; periodEnd: Date } | null {
    const y = now.getFullYear();
    const m = now.getMonth();
    const day = Math.min(dueDay || 1, 28);

    switch (frequency) {
      case 'MONTHLY':
        return {
          dueDate: new Date(y, m, day),
          periodStart: new Date(y, m, 1),
          periodEnd: new Date(y, m + 1, 0, 23, 59, 59),
        };
      case 'QUARTERLY': {
        const quarterStartMonth = Math.floor(m / 3) * 3;
        const quarterEndMonth = quarterStartMonth + 2;
        return {
          dueDate: new Date(y, quarterEndMonth, day),
          periodStart: new Date(y, quarterStartMonth, 1),
          periodEnd: new Date(y, quarterEndMonth + 1, 0, 23, 59, 59),
        };
      }
      case 'YEARLY':
        return {
          dueDate: new Date(y, 11, day),
          periodStart: new Date(y, 0, 1),
          periodEnd: new Date(y, 11, 31, 23, 59, 59),
        };
      case 'WEEKLY': {
        const weekStart = new Date(now);
        weekStart.setDate(now.getDate() - now.getDay());
        weekStart.setHours(0, 0, 0, 0);
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 6);
        weekEnd.setHours(23, 59, 59);
        const dueDate = new Date(weekStart);
        dueDate.setDate(weekStart.getDate() + Math.min(dueDay, 6));
        return { dueDate, periodStart: weekStart, periodEnd: weekEnd };
      }
      case 'ONE_TIME':
        return {
          dueDate: new Date(y, m, day),
          periodStart: new Date(0), // epoch — matches only if no charge ever created
          periodEnd: new Date(y + 100, 0, 1),
        };
      default:
        return null;
    }
  }

  async generateChargeForAssignment(assignmentId: string, now = new Date()) {
    const assignment = await this.prisma.feeAssignment.findUnique({
      where: { id: assignmentId },
      include: { fee: true, member: true },
    });

    if (!assignment || !assignment.isActive || !assignment.fee.isActive) return null;

    const fee = assignment.fee;
    const period = this.getPeriodBounds(fee.frequency, fee.dueDay, now);
    if (!period) return null;

    const existing = await this.prisma.charge.findFirst({
      where: {
        assignmentId: assignment.id,
        dueDate: { gte: period.periodStart, lte: period.periodEnd },
      },
    });

    if (existing) return null;

    const amount = assignment.amount ?? fee.amount;
    const label =
      fee.frequency === 'ONE_TIME'
        ? fee.name
        : `${fee.name} — ${now.toLocaleString('default', { month: 'long' })} ${now.getFullYear()}`;

    return this.prisma.charge.create({
      data: {
        networkId: assignment.member.networkId,
        memberId: assignment.memberId,
        feeId: assignment.feeId,
        assignmentId: assignment.id,
        amount,
        dueDate: period.dueDate,
        status: 'PENDING',
        description: label,
      },
    });
  }

  // ─── Scheduled Tasks ────────────────────────────────────────────────────────

  @Cron('0 0 * * *') // midnight daily
  async generateScheduledCharges() {
    this.logger.log('Running daily charge generation job...');

    const now = new Date();

    const activeAssignments = await this.prisma.feeAssignment.findMany({
      where: {
        isActive: true,
        fee: { isActive: true, type: 'ASSIGNED', frequency: { not: 'ONE_TIME' } },
        OR: [{ endDate: null }, { endDate: { gte: now } }],
      },
      select: { id: true },
    });

    let generated = 0;
    for (const { id } of activeAssignments) {
      const charge = await this.generateChargeForAssignment(id, now);
      if (charge) generated++;
    }

    this.logger.log(`Generated ${generated} charges`);
  }

  @Cron('0 6 * * *') // 6am daily
  async updateOverdueStatuses() {
    this.logger.log('Running overdue status update job...');

    const now = new Date();

    const result = await this.prisma.charge.updateMany({
      where: {
        status: 'PENDING',
        dueDate: { lt: now },
      },
      data: { status: 'OVERDUE' },
    });

    this.logger.log(`Marked ${result.count} charges as OVERDUE`);
  }

  @Cron('0 6 * * *') // also at 6am — apply penalties to newly-overdue charges
  async applyPenalties() {
    this.logger.log('Running penalty application job...');

    const now = new Date();

    const overdueCharges = await this.prisma.charge.findMany({
      where: {
        status: 'OVERDUE',
        penaltyApplied: false,
        fee: {
          penaltyEnabled: true,
        },
      },
      include: { fee: true },
    });

    let applied = 0;

    for (const charge of overdueCharges) {
      if (!charge.fee || !charge.fee.penaltyEnabled) continue;

      const gracePeriodEnd = new Date(charge.dueDate);
      gracePeriodEnd.setDate(gracePeriodEnd.getDate() + charge.fee.penaltyGraceDays);

      if (now <= gracePeriodEnd) continue;

      const penaltyAmount = Number(charge.amount) * (Number(charge.fee.penaltyPercent) / 100);
      const newAmount = Number(charge.amount) + penaltyAmount;

      await this.prisma.charge.update({
        where: { id: charge.id },
        data: {
          amount: newAmount,
          penaltyApplied: true,
          penaltyAmount,
        },
      });

      applied++;
    }

    this.logger.log(`Applied penalties to ${applied} charges`);
  }
}
