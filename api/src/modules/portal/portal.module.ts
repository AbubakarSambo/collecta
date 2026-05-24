import { Module } from '@nestjs/common';
import { PortalService } from './portal.service';
import { PortalController } from './portal.controller';
import { PaystackModule } from '../paystack';
import { EmailModule } from '../email/email.module';

@Module({
  imports: [PaystackModule, EmailModule],
  controllers: [PortalController],
  providers: [PortalService],
  exports: [PortalService],
})
export class PortalModule {}
