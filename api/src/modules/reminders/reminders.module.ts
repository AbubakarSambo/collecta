import { Module } from '@nestjs/common';
import { RemindersService } from './reminders.service';
import { RemindersController } from './reminders.controller';
import { EmailModule } from '../email';
import { NetworkGuard } from '../../common/guards';

@Module({
  imports: [EmailModule],
  controllers: [RemindersController],
  providers: [RemindersService, NetworkGuard],
  exports: [RemindersService],
})
export class RemindersModule {}
