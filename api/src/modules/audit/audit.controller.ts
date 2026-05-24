import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuditService } from './audit.service';
import { NetworkGuard } from '../../common/guards';
import { PaginationDto } from '../../common/dto';

@ApiTags('Audit')
@ApiBearerAuth()
@UseGuards(NetworkGuard)
@Controller('networks/:networkId/audit-logs')
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get()
  @ApiOperation({ summary: 'Get audit log for network' })
  async findAll(@Param('networkId') networkId: string, @Query() pagination: PaginationDto) {
    return this.auditService.findAll(networkId, pagination);
  }
}
