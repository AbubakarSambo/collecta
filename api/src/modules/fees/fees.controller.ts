import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { FeesService } from './fees.service';
import { CreateFeeDto, UpdateFeeDto, AssignFeeDto } from './dto';
import { NetworkGuard } from '../../common/guards';
import { PaginationDto } from '../../common/dto';

@ApiTags('Fees')
@ApiBearerAuth()
@UseGuards(NetworkGuard)
@Controller('networks/:networkId/fees')
export class FeesController {
  constructor(private readonly feesService: FeesService) {}

  @Get()
  @ApiOperation({ summary: 'List all fees in a network' })
  async findAll(@Param('networkId') networkId: string, @Query() pagination: PaginationDto) {
    return this.feesService.findAll(networkId, pagination);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a fee by ID' })
  async findOne(@Param('networkId') networkId: string, @Param('id') id: string) {
    return this.feesService.findOne(id, networkId);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new fee' })
  async create(@Param('networkId') networkId: string, @Body() dto: CreateFeeDto) {
    return this.feesService.create(networkId, dto);
  }

  @Post(':feeId/assign')
  @ApiOperation({ summary: 'Assign a fee to members' })
  async assignToMembers(
    @Param('networkId') networkId: string,
    @Param('feeId') feeId: string,
    @Body() dto: AssignFeeDto,
  ) {
    return this.feesService.assignToMembers(feeId, networkId, dto);
  }

  @Delete(':feeId/assign/:memberId')
  @ApiOperation({ summary: 'Remove a fee assignment from a member' })
  async removeAssignment(
    @Param('networkId') networkId: string,
    @Param('feeId') feeId: string,
    @Param('memberId') memberId: string,
  ) {
    return this.feesService.removeAssignment(feeId, memberId, networkId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a fee' })
  async update(
    @Param('networkId') networkId: string,
    @Param('id') id: string,
    @Body() dto: UpdateFeeDto,
  ) {
    return this.feesService.update(id, networkId, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a fee' })
  async remove(@Param('networkId') networkId: string, @Param('id') id: string) {
    return this.feesService.remove(id, networkId);
  }
}
