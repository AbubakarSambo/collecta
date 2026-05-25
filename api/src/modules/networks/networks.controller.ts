import {
  Controller,
  Get,
  Patch,
  Post,
  Body,
  Param,
  Query,
  BadRequestException,
  ForbiddenException,
  Req,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { NetworksService } from './networks.service';
import { UpdateNetworkDto } from './dto/update-network.dto';
import { SubmitVerificationDto } from './dto/submit-verification.dto';
import { CurrentUser, CurrentUserData, Public } from '../../common';
import { Request } from 'express';

@ApiTags('Networks')
@Controller('networks')
export class NetworksController {
  constructor(private readonly networksService: NetworksService) {}

  @Get('me')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get the current admin network' })
  async getMyNetwork(@CurrentUser() user: CurrentUserData) {
    return this.networksService.findByAdmin(user.id);
  }

  @Patch('me')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update the current admin network' })
  async updateMyNetwork(
    @CurrentUser() user: CurrentUserData,
    @Body() dto: UpdateNetworkDto,
  ) {
    return this.networksService.update(user.id, dto);
  }

  @Get('me/paystack-status')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get Paystack connection status for current network' })
  async getPaystackStatus(@CurrentUser() user: CurrentUserData) {
    return this.networksService.getPaystackStatus(user.id);
  }

  @Post('me/setup-paystack')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Connect bank account and create Paystack subaccount' })
  async setupPaystack(
    @CurrentUser() user: CurrentUserData,
    @Body() body: { bankCode: string; accountNumber: string },
  ) {
    return this.networksService.setupPaystack(user.id, body.bankCode, body.accountNumber);
  }

  // --- Verification endpoints ---

  @Post('verification/submit')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Submit network for verification' })
  async submitVerification(
    @CurrentUser() user: CurrentUserData,
    @Body() dto: SubmitVerificationDto,
  ) {
    return this.networksService.submitVerification(user.id, dto);
  }

  @Post('verification/approve/:networkId')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Approve a network verification (platform admin only)' })
  async approveVerification(
    @Param('networkId') networkId: string,
    @Req() req: Request & { user: CurrentUserData },
  ) {
    if (!req.user?.isPlatformAdmin) {
      throw new ForbiddenException('Platform admin access required');
    }
    return this.networksService.approveVerification(networkId);
  }

  @Post('verification/reject/:networkId')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Reject a network verification (platform admin only)' })
  async rejectVerification(
    @Param('networkId') networkId: string,
    @Body() body: { reason: string },
    @Req() req: Request & { user: CurrentUserData },
  ) {
    if (!req.user?.isPlatformAdmin) {
      throw new ForbiddenException('Platform admin access required');
    }
    return this.networksService.rejectVerification(networkId, body.reason);
  }

  // --- SMS credits endpoints ---

  @Get('sms-credits')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get SMS credits balance for the current network' })
  async getSmsCredits(@CurrentUser() user: CurrentUserData) {
    return this.networksService.getSmsCredits(user.id);
  }

  @Post('sms-credits/topup')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Top up SMS credits (bundles: 100, 500, 1000, 5000)' })
  async topUpSmsCredits(
    @CurrentUser() user: CurrentUserData,
    @Body() body: { bundle: number },
  ) {
    return this.networksService.topUpSmsCredits(user.id, body.bundle);
  }

  @Public()
  @Get('service-charge')
  @ApiOperation({ summary: 'Get service charge breakdown for a given amount (public)' })
  @ApiQuery({ name: 'amount', required: true, type: Number, description: 'Amount in Naira' })
  getServiceCharge(@Query('amount') amountStr: string) {
    const amount = parseFloat(amountStr);
    if (isNaN(amount) || amount <= 0) {
      throw new BadRequestException('amount must be a positive number');
    }
    return this.networksService.getServiceChargeBreakdown(amount);
  }

  @Public()
  @Get(':slug')
  @ApiOperation({ summary: 'Get network by slug (public — for member portal)' })
  async getBySlug(@Param('slug') slug: string) {
    return this.networksService.findBySlug(slug);
  }
}
