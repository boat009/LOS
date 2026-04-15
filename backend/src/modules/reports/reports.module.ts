import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';
import { LoanApplication } from '../../database/entities/loan-application.entity';
import { ApprovalWorkflow } from '../../database/entities/approval-workflow.entity';
import { AuditLog } from '../../database/entities/audit-log.entity';

@Module({
  imports: [TypeOrmModule.forFeature([LoanApplication, ApprovalWorkflow, AuditLog])],
  controllers: [ReportsController],
  providers: [ReportsService],
})
export class ReportsModule {}
