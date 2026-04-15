import {
  Controller, Get, Query, UseGuards, Res, StreamableFile,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Response } from 'express';
import { ReportsService } from './reports.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators';
import { UserRole, ApplicationStatus } from '../../common/enums';

@ApiTags('Reports & Dashboard')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('api/v1/reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('dashboard')
  @ApiOperation({ summary: 'Real-time dashboard stats' })
  async getDashboard() {
    return this.reportsService.getDashboard();
  }

  @Get('applications')
  @Roles(UserRole.ADMIN, UserRole.AUDIT, UserRole.CREDIT_DIRECTOR, UserRole.VP_CREDIT)
  @ApiOperation({ summary: 'Application report (date range)' })
  async getApplicationReport(
    @Query('from') from: string,
    @Query('to') to: string,
    @Query('status') status: ApplicationStatus,
  ) {
    return this.reportsService.getApplicationReport(from, to, status);
  }

  @Get('sla')
  @Roles(UserRole.ADMIN, UserRole.AUDIT, UserRole.CREDIT_DIRECTOR)
  @ApiOperation({ summary: 'SLA compliance report' })
  async getSlaReport(@Query('from') from: string, @Query('to') to: string) {
    return this.reportsService.getSlaReport(from, to);
  }

  @Get('approver-performance')
  @Roles(UserRole.ADMIN, UserRole.AUDIT)
  @ApiOperation({ summary: 'Approver performance report' })
  async getApproverPerformance(@Query('from') from: string, @Query('to') to: string) {
    return this.reportsService.getApproverPerformance(from, to);
  }

  @Get('export/excel')
  @Roles(UserRole.ADMIN, UserRole.AUDIT, UserRole.CREDIT_DIRECTOR)
  @ApiOperation({ summary: 'Export applications to Excel' })
  async exportExcel(
    @Query('from') from: string,
    @Query('to') to: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    const buffer = await this.reportsService.exportToExcel(from, to);
    const filename = `LOS-Report-${from}-${to}.xlsx`;
    res.set({
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length': buffer.length,
    });
    return new StreamableFile(buffer);
  }
}
