import { Module } from '@nestjs/common';
import { AuditService } from './audit.service';
import { AuditController } from './audit.controller';
import { NetworkGuard } from '../../common/guards';

@Module({
  controllers: [AuditController],
  providers: [AuditService, NetworkGuard],
  exports: [AuditService],
})
export class AuditModule {}
