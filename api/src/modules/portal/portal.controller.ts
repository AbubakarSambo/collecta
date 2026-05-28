import { Controller, Get, Post, Param, Query, Body, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { PortalService } from './portal.service';
import { Public } from '../../common';
import { PayOpenFeeDto } from './dto/pay-open-fee.dto';

@ApiTags('Portal')
@Public()
@Controller('portal')
export class PortalController {
  constructor(private readonly portalService: PortalService) {}

  @Get('verify-payment')
  @ApiOperation({ summary: 'Verify a Paystack payment by reference (public)' })
  async verifyPayment(@Query('reference') reference: string) {
    return this.portalService.verifyPayment(reference);
  }

  @Get(':slug/member-by-email')
  @ApiOperation({ summary: 'Look up a member by email address (public)' })
  async getMemberByEmail(
    @Param('slug') slug: string,
    @Query('email') email: string,
  ) {
    if (!email) throw new BadRequestException('email query param is required');
    return this.portalService.findMemberByEmail(slug, email);
  }

  @Get(':slug/payment-history')
  @ApiOperation({ summary: 'Get full payment history for a member by email (public)' })
  async getPaymentHistoryByEmail(
    @Param('slug') slug: string,
    @Query('email') email: string,
  ) {
    if (!email) throw new BadRequestException('email query param is required');
    return this.portalService.getMemberPaymentHistoryByEmail(slug, email);
  }

  @Post(':slug/open-fee/:feeId/pay')
  @ApiOperation({ summary: 'Pay an open fee (no member ID required)' })
  async payOpenFee(
    @Param('slug') slug: string,
    @Param('feeId') feeId: string,
    @Body() body: PayOpenFeeDto,
  ) {
    return this.portalService.payOpenFee(slug, feeId, body);
  }

  @Get(':slug/charge/:chargeId')
  @ApiOperation({ summary: 'Get charge details for payment page' })
  async getCharge(
    @Param('slug') slug: string,
    @Param('chargeId') chargeId: string,
  ) {
    return this.portalService.getCharge(slug, chargeId);
  }

  @Get(':slug')
  @ApiOperation({ summary: 'Get network portal data (public)' })
  async getNetworkPortal(@Param('slug') slug: string) {
    return this.portalService.getNetworkPortal(slug);
  }

  @Get(':slug/member/:memberId/profile')
  @ApiOperation({ summary: 'Get member compliance profile (public)' })
  async getMemberProfile(
    @Param('slug') slug: string,
    @Param('memberId') memberId: string,
  ) {
    return this.portalService.getMemberProfile(slug, memberId);
  }

  @Post(':slug/pay/:chargeId')
  @ApiOperation({ summary: 'Initiate payment for a charge (returns Paystack URL)' })
  async initiatePayment(
    @Param('slug') slug: string,
    @Param('chargeId') chargeId: string,
    @Body('amount') amount?: number,
    @Body('paymentMethod') paymentMethod?: 'card' | 'bank_transfer' | 'ussd' | 'mobile_money',
  ) {
    return this.portalService.initiatePayment(
      slug,
      chargeId,
      amount ? Number(amount) : undefined,
      paymentMethod,
    );
  }

  @Get(':slug/join/:token')
  @ApiOperation({ summary: 'Look up member by invite token' })
  async getMemberByInvite(
    @Param('slug') slug: string,
    @Param('token') token: string,
  ) {
    return this.portalService.findMemberByToken(slug, token);
  }

  @Post(':slug/member/:memberId/sms-opt-out')
  @ApiOperation({ summary: 'Opt a member out of SMS reminders (public, no auth required)' })
  async smsOptOut(
    @Param('slug') slug: string,
    @Param('memberId') memberId: string,
  ) {
    return this.portalService.smsOptOut(slug, memberId);
  }
}
