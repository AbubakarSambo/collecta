import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PaginationDto, paginate } from '../../common/dto';

@Injectable()
export class AuditService {
  constructor(private prisma: PrismaService) {}

  async log(
    networkId: string,
    actorId: string | null,
    action: string,
    entityType?: string,
    entityId?: string,
    metadata?: object,
  ) {
    return this.prisma.auditLog.create({
      data: {
        networkId,
        actorId,
        action,
        entityType,
        entityId,
        metadata,
      },
    });
  }

  async findAll(networkId: string, pagination: PaginationDto) {
    const { page = 1, limit = 50 } = pagination;
    const skip = (page - 1) * limit;

    const [logs, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where: { networkId },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.auditLog.count({ where: { networkId } }),
    ]);

    return paginate(logs, total, page, limit);
  }
}
