import { Module } from '@nestjs/common';
import { APP_GUARD, APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { ScheduleModule } from '@nestjs/schedule';
import { ConfigModule } from './config';
import { PrismaModule } from './modules/prisma';
import { AuthModule } from './modules/auth';
import { NetworksModule } from './modules/networks';
import { MembersModule } from './modules/members';
import { FeesModule } from './modules/fees';
import { ChargesModule } from './modules/charges';
import { PaymentsModule } from './modules/payments';
import { PaystackModule } from './modules/paystack';
import { RemindersModule } from './modules/reminders';
import { ReportsModule } from './modules/reports';
import { AuditModule } from './modules/audit';
import { EmailModule } from './modules/email';
import { PortalModule } from './modules/portal';
import { MemberAuthModule } from './modules/member-auth/member-auth.module';
import { JwtAuthGuard, RolesGuard, GlobalExceptionFilter, TransformInterceptor } from './common';

@Module({
  imports: [
    ConfigModule,
    ThrottlerModule.forRoot([{ name: 'global', ttl: 60000, limit: 60 }]),
    ScheduleModule.forRoot(),
    PrismaModule,
    EmailModule,
    AuthModule,
    NetworksModule,
    MembersModule,
    FeesModule,
    ChargesModule,
    PaymentsModule,
    PaystackModule,
    RemindersModule,
    ReportsModule,
    AuditModule,
    PortalModule,
    MemberAuthModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
    {
      provide: APP_FILTER,
      useClass: GlobalExceptionFilter,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: TransformInterceptor,
    },
  ],
})
export class AppModule {}
