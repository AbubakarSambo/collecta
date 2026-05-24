import { Module } from '@nestjs/common';
import { MemberAuthService } from './member-auth.service';
import { MemberAuthController } from './member-auth.controller';
import { EmailModule } from '../email/email.module';

@Module({
  imports: [EmailModule],
  controllers: [MemberAuthController],
  providers: [MemberAuthService],
})
export class MemberAuthModule {}
