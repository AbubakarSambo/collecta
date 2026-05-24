import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { ChargesService } from './charges.service';
import { CreateChargeDto } from './dto/create-charge.dto';
import { ListChargesDto } from './dto/list-charges.dto';
import { NetworkGuard } from '../../common/guards';

@ApiTags('Charges')
@ApiBearerAuth()
@UseGuards(NetworkGuard)
@Controller('networks/:networkId/charges')
export class ChargesController {
  constructor(private readonly chargesService: ChargesService) {}

  @Get()
  @ApiOperation({ summary: 'List all charges in a network' })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'memberId', required: false })
  @ApiQuery({ name: 'feeId', required: false })
  async findAll(
    @Param('networkId') networkId: string,
    @Query() query: ListChargesDto,
  ) {
    return this.chargesService.findAll(networkId, query);
  }

  @Get('summary')
  @ApiOperation({ summary: 'Get charge summary stats for dashboard' })
  async getSummary(@Param('networkId') networkId: string) {
    return this.chargesService.getSummary(networkId);
  }

  @Post()
  @ApiOperation({ summary: 'Create a manual charge' })
  async create(@Param('networkId') networkId: string, @Body() dto: CreateChargeDto) {
    return this.chargesService.create(networkId, dto);
  }

  @Patch(':id/waive')
  @ApiOperation({ summary: 'Waive a charge' })
  async waive(@Param('networkId') networkId: string, @Param('id') id: string) {
    return this.chargesService.waive(id, networkId);
  }
}
