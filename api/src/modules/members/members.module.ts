import { Module } from '@nestjs/common';
import { MembersService } from './members.service';
import { MembersController } from './members.controller';
import { PrismaModule } from '../prisma';
import { NetworkGuard } from '../../common/guards';

@Module({
  imports: [PrismaModule],
  controllers: [MembersController],
  providers: [MembersService, NetworkGuard],
  exports: [MembersService],
})
export class MembersModule {}
