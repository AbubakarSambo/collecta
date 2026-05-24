import { Controller, Post, Body } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { MemberAuthService } from './member-auth.service';
import { RequestOtpDto } from './dto/request-otp.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { Public } from '../../common';

@ApiTags('Member Auth')
@Public()
@Controller('member-auth')
export class MemberAuthController {
  constructor(private readonly memberAuthService: MemberAuthService) {}

  @Post('request-otp')
  @ApiOperation({ summary: 'Send a one-time login code to a member email' })
  async requestOtp(@Body() dto: RequestOtpDto) {
    return this.memberAuthService.requestOtp(dto.slug, dto.email);
  }

  @Post('verify-otp')
  @ApiOperation({ summary: 'Verify OTP and return member session data' })
  async verifyOtp(@Body() dto: VerifyOtpDto) {
    return this.memberAuthService.verifyOtp(dto.slug, dto.email, dto.otp);
  }
}
