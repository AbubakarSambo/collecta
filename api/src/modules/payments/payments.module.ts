import { Module } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { PaymentsController } from './payments.controller';
import { PaystackModule } from '../paystack';
import { NetworkGuard } from '../../common/guards';

@Module({
  imports: [PaystackModule],
  controllers: [PaymentsController],
  providers: [PaymentsService, NetworkGuard],
  exports: [PaymentsService],
})
export class PaymentsModule {}
