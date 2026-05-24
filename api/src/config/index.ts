import { Module } from '@nestjs/common';
import { ConfigModule as NestConfigModule } from '@nestjs/config';
import appConfig from './app.config';
import jwtConfig from './jwt.config';
import paystackConfig from './paystack.config';
import africasTalkingConfig from './africas-talking.config';
import resendConfig from './resend.config';

@Module({
  imports: [
    NestConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig, jwtConfig, paystackConfig, africasTalkingConfig, resendConfig],
    }),
  ],
})
export class ConfigModule {}
