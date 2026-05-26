import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  Headers,
  RawBodyRequest,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Request } from 'express';
import { PaymentsService } from './payments.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { NetworkGuard } from '../../common/guards';
import { Public, CurrentUser, CurrentUserData } from '../../common';
import { PaginationDto } from '../../common/dto';

@ApiTags('Payments')
@Controller()
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Get('networks/:networkId/payments')
  @ApiBearerAuth()
  @UseGuards(NetworkGuard)
  @ApiOperation({ summary: 'List all payments in a network' })
  async findAll(
    @Param('networkId') networkId: string,
    @Query() pagination: PaginationDto,
    @Query('memberId') memberId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.paymentsService.findAll(networkId, {
      ...pagination,
      memberId,
      startDate,
      endDate,
    });
  }

  @Post('networks/:networkId/payments')
  @ApiBearerAuth()
  @UseGuards(NetworkGuard)
  @ApiOperation({ summary: 'Record a manual payment' })
  async createManual(
    @Param('networkId') networkId: string,
    @Body() dto: CreatePaymentDto,
    @CurrentUser() user: CurrentUserData,
  ) {
    return this.paymentsService.recordPayment(networkId, dto, user.id);
  }

  @Public()
  @Post('webhooks/paystack')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Paystack webhook receiver (Nigeria)' })
  async handleWebhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers('x-paystack-signature') signature: string,
  ) {
    return this.paymentsService.handlePaystackWebhook(req.rawBody!, signature);
  }

  @Public()
  @Post('webhooks/paystack/ke')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Paystack webhook receiver (Kenya — same handler, separate endpoint for routing clarity)' })
  async handleWebhookKe(
    @Req() req: RawBodyRequest<Request>,
    @Headers('x-paystack-signature') signature: string,
  ) {
    return this.paymentsService.handlePaystackWebhook(req.rawBody!, signature);
  }
}
