import { Module } from '@nestjs/common';
import { RemindersService } from './reminders.service';
import { RemindersController } from './reminders.controller';
import { EmailModule } from '../email';
import { WhatsappModule } from '../whatsapp';
import { NetworkGuard } from '../../common/guards';

@Module({
  imports: [EmailModule, WhatsappModule],
  controllers: [RemindersController],
  providers: [RemindersService, NetworkGuard],
  exports: [RemindersService],
})
export class RemindersModule {}
