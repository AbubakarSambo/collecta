import { Module } from '@nestjs/common';
import { FeesService } from './fees.service';
import { FeesController } from './fees.controller';
import { NetworkGuard } from '../../common/guards';
import { ChargesModule } from '../charges/charges.module';

@Module({
  imports: [ChargesModule],
  controllers: [FeesController],
  providers: [FeesService, NetworkGuard],
  exports: [FeesService],
})
export class FeesModule {}
