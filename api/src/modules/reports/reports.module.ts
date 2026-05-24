import { Module } from '@nestjs/common';
import { ReportsService } from './reports.service';
import { ReportsController } from './reports.controller';
import { NetworkGuard } from '../../common/guards';

@Module({
  controllers: [ReportsController],
  providers: [ReportsService, NetworkGuard],
  exports: [ReportsService],
})
export class ReportsModule {}
