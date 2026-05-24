import { Controller, Get, Post, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { IsString, MaxLength } from 'class-validator';
import { PaystackService } from './paystack.service';

class VerifyAccountDto {
  @IsString()
  accountNumber: string;

  @IsString()
  @MaxLength(10)
  bankCode: string;
}

@ApiTags('Paystack')
@ApiBearerAuth()
@Controller('paystack')
export class PaystackController {
  constructor(private readonly paystackService: PaystackService) {}

  @Get('banks')
  @ApiOperation({ summary: 'List Nigerian banks' })
  async getBanks() {
    return this.paystackService.listBanks();
  }

  @Post('verify-account')
  @ApiOperation({ summary: 'Verify a bank account number' })
  async verifyAccount(@Body() dto: VerifyAccountDto) {
    return this.paystackService.verifyBankAccount(dto.accountNumber, dto.bankCode);
  }
}
