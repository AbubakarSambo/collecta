import { Controller, Get, Param, Query, Res, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Response } from 'express';
import { ReportsService } from './reports.service';
import { NetworkGuard } from '../../common/guards';

@ApiTags('Reports')
@ApiBearerAuth()
@UseGuards(NetworkGuard)
@Controller('networks/:networkId/reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('collection')
  @ApiOperation({ summary: 'Get collection summary report' })
  async getCollectionReport(
    @Param('networkId') networkId: string,
    @Query('months') months = 6,
  ) {
    return this.reportsService.generateCollectionReport(networkId, Number(months));
  }

  @Get('members')
  @ApiOperation({ summary: 'Get member compliance report' })
  async getMemberComplianceReport(@Param('networkId') networkId: string) {
    return this.reportsService.generateMemberComplianceReport(networkId);
  }

  @Get('export/excel')
  @ApiOperation({ summary: 'Export payments to Excel/CSV' })
  async exportToExcel(@Param('networkId') networkId: string, @Res() res: Response) {
    const buffer = await this.reportsService.exportToExcel(networkId);
    res.set({
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="collecta-payments-${networkId}.csv"`,
      'Content-Length': buffer.length,
    });
    res.send(buffer);
  }

  @Get('export/pdf')
  @ApiOperation({ summary: 'Export report to PDF' })
  async exportToPdf(@Param('networkId') networkId: string, @Res() res: Response) {
    const buffer = await this.reportsService.exportToPdf(networkId);
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="collecta-report-${networkId}.pdf"`,
      'Content-Length': buffer.length,
    });
    res.send(buffer);
  }
}
