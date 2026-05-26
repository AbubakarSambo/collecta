import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { RemindersService } from './reminders.service';
import { BlastReminderDto } from './dto/blast-reminder.dto';
import { NetworkGuard } from '../../common/guards';

@ApiTags('Reminders')
@ApiBearerAuth()
@UseGuards(NetworkGuard)
@Controller('networks/:networkId/reminders')
export class RemindersController {
  constructor(private readonly remindersService: RemindersService) {}

  // ─── Rules ───────────────────────────────────────────────────────────────────

  @Get('rules')
  @ApiOperation({ summary: 'Get configured reminder rules for this network' })
  async getRules(@Param('networkId') networkId: string) {
    return this.remindersService.getRules(networkId);
  }

  @Post('rules')
  @ApiOperation({ summary: 'Create a reminder rule' })
  async createRule(
    @Param('networkId') networkId: string,
    @Body() body: { daysOffset: number; channels: string[] },
  ) {
    return this.remindersService.createRule(networkId, body.daysOffset, body.channels);
  }

  @Delete('rules/:ruleId')
  @ApiOperation({ summary: 'Delete a reminder rule' })
  async deleteRule(
    @Param('networkId') networkId: string,
    @Param('ruleId') ruleId: string,
  ) {
    return this.remindersService.deleteRule(networkId, ruleId);
  }

  // ─── History & Blast ─────────────────────────────────────────────────────────

  @Get('history')
  @ApiOperation({ summary: 'Get reminder history' })
  async getHistory(@Param('networkId') networkId: string) {
    return this.remindersService.getReminderHistory(networkId);
  }

  @Get('blast-estimate')
  @ApiOperation({ summary: 'Estimate credit cost of a blast reminder' })
  async blastEstimate(
    @Param('networkId') networkId: string,
    @Query('channels') channels: string,
  ) {
    const channelList = channels ? channels.split(',') : ['EMAIL'];
    return this.remindersService.estimateBlast(networkId, channelList);
  }

  @Post('blast')
  @ApiOperation({ summary: 'Send reminders to all non-payers' })
  async blast(@Param('networkId') networkId: string, @Body() dto: BlastReminderDto) {
    return this.remindersService.blastReminders(networkId, dto);
  }

  @Post('member/:memberId')
  @ApiOperation({ summary: 'Send reminders to a specific member' })
  async sendToMember(
    @Param('networkId') networkId: string,
    @Param('memberId') memberId: string,
    @Body() dto: BlastReminderDto,
  ) {
    return this.remindersService.sendToMember(networkId, memberId, dto);
  }
}
