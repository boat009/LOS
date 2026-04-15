import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WorkflowController } from './workflow.controller';
import { WorkflowService } from './workflow.service';
import { SlaMonitorService } from './sla-monitor.service';
import { LoanApplication } from '../../database/entities/loan-application.entity';
import { ApprovalWorkflow } from '../../database/entities/approval-workflow.entity';
import { ApprovalMatrix } from '../../database/entities/approval-matrix.entity';
import { ApprovalCriteria } from '../../database/entities/approval-criteria.entity';
import { ApplicationScore } from '../../database/entities/application-score.entity';
import { AuditLog } from '../../database/entities/audit-log.entity';
import { UserDelegation } from '../../database/entities/user-delegation.entity';
import { Notification } from '../../database/entities/notification.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      LoanApplication, ApprovalWorkflow, ApprovalMatrix, ApprovalCriteria,
      ApplicationScore, AuditLog, UserDelegation, Notification,
    ]),
    // ScheduleModule is already registered globally in AppModule
  ],
  controllers: [WorkflowController],
  providers: [WorkflowService, SlaMonitorService],
  exports: [WorkflowService],
})
export class WorkflowModule {}
