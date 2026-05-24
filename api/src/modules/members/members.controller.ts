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
import { MembersService } from './members.service';
import { CreateMemberDto, UpdateMemberDto, ImportMembersDto, ListMembersDto } from './dto';
import { NetworkGuard } from '../../common/guards';
import { ConfigService } from '@nestjs/config';

@ApiTags('Members')
@ApiBearerAuth()
@UseGuards(NetworkGuard)
@Controller('networks/:networkId/members')
export class MembersController {
  constructor(
    private readonly membersService: MembersService,
    private readonly configService: ConfigService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List all members in a network' })
  async findAll(
    @Param('networkId') networkId: string,
    @Query() query: ListMembersDto,
  ) {
    return this.membersService.findAll(networkId, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a member by ID' })
  async findOne(@Param('networkId') networkId: string, @Param('id') id: string) {
    return this.membersService.findOne(id, networkId);
  }

  @Post()
  @ApiOperation({ summary: 'Add a new member to the network' })
  async create(@Param('networkId') networkId: string, @Body() dto: CreateMemberDto) {
    return this.membersService.create(networkId, dto);
  }

  @Post('import')
  @ApiOperation({ summary: 'Import members from CSV' })
  async importCsv(@Param('networkId') networkId: string, @Body() dto: ImportMembersDto) {
    return this.membersService.importFromCsv(networkId, dto);
  }

  @Post(':id/invite-link')
  @ApiOperation({ summary: 'Generate an invite link for a member' })
  async generateInviteLink(
    @Param('networkId') networkId: string,
    @Param('id') id: string,
  ) {
    const appUrl = this.configService.get<string>('app.frontendUrl') || 'https://collecta.africa';
    return this.membersService.generateInviteLink(id, networkId, appUrl);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a member' })
  async update(
    @Param('networkId') networkId: string,
    @Param('id') id: string,
    @Body() dto: UpdateMemberDto,
  ) {
    return this.membersService.update(id, networkId, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a member' })
  async remove(@Param('networkId') networkId: string, @Param('id') id: string) {
    return this.membersService.remove(id, networkId);
  }
}
