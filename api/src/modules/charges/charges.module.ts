import { Module } from '@nestjs/common';
import { ChargesService } from './charges.service';
import { ChargesController } from './charges.controller';
import { NetworkGuard } from '../../common/guards';

@Module({
  controllers: [ChargesController],
  providers: [ChargesService, NetworkGuard],
  exports: [ChargesService],
})
export class ChargesModule {}
