import { Module } from '@nestjs/common';
import { NetworksService } from './networks.service';
import { NetworksController } from './networks.controller';
import { EmailModule } from '../email/email.module';

@Module({
  imports: [EmailModule],
  controllers: [NetworksController],
  providers: [NetworksService],
  exports: [NetworksService],
})
export class NetworksModule {}
