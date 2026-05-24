import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
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

  @Get('history')
  @ApiOperation({ summary: 'Get reminder history' })
  async getHistory(@Param('networkId') networkId: string) {
    return this.remindersService.getReminderHistory(networkId);
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
