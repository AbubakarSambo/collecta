import { Controller, Get, Patch, Post, Body, Param } from '@nestjs/common';
import { IsString, MaxLength } from 'class-validator';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { NetworksService } from './networks.service';
import { UpdateNetworkDto } from './dto/update-network.dto';
import { CurrentUser, CurrentUserData, Public } from '../../common';

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

  @Public()
  @Get(':slug')
  @ApiOperation({ summary: 'Get network by slug (public — for member portal)' })
  async getBySlug(@Param('slug') slug: string) {
    return this.networksService.findBySlug(slug);
  }
}
