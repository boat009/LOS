import {
  Injectable, BadRequestException, ForbiddenException,
  NotFoundException, Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import * as dayjs from 'dayjs';
import { LoanApplication } from '../../database/entities/loan-application.entity';
import { ApprovalWorkflow } from '../../database/entities/approval-workflow.entity';
import { ApprovalMatrix } from '../../database/entities/approval-matrix.entity';
import { ApprovalCriteria } from '../../database/entities/approval-criteria.entity';
import { ApplicationScore } from '../../database/entities/application-score.entity';
import { AuditLog } from '../../database/entities/audit-log.entity';
import { UserDelegation } from '../../database/entities/user-delegation.entity';
import { Notification } from '../../database/entities/notification.entity';
import {
  ApplicationStatus, ApprovalAction, AuditAction, NotificationChannel, NotificationStatus,
} from '../../common/enums';
import { ApprovalActionDto } from './dto/approval-action.dto';

@Injectable()
export class WorkflowService {
  private readonly logger = new Logger(WorkflowService.name);

  constructor(
    @InjectRepository(LoanApplication) private appRepo: Repository<LoanApplication>,
    @InjectRepository(ApprovalWorkflow) private workflowRepo: Repository<ApprovalWorkflow>,
    @InjectRepository(ApprovalMatrix) private matrixRepo: Repository<ApprovalMatrix>,
    @InjectRepository(ApprovalCriteria) private criteriaRepo: Repository<ApprovalCriteria>,
    @InjectRepository(ApplicationScore) private scoreRepo: Repository<ApplicationScore>,
    @InjectRepository(AuditLog) private auditRepo: Repository<AuditLog>,
    @InjectRepository(UserDelegation) private delegationRepo: Repository<UserDelegation>,
    @InjectRepository(Notification) private notifRepo: Repository<Notification>,
    private dataSource: DataSource,
    private config: ConfigService,
  ) {}

  async submitApplication(applicationId: string, userId: string, ip: string) {
    const app = await this.appRepo.findOne({
      where: { id: applicationId },
      relations: ['customer', 'product'],
    });

    if (!app) throw new NotFoundException('Application not found');
    if (app.saleUserId !== userId) throw new ForbiddenException('Not your application');
    if (![ApplicationStatus.DRAFT, ApplicationStatus.RETURNED, ApplicationStatus.RESUBMITTED].includes(app.status)) {
      throw new BadRequestException(`Cannot submit application in status: ${app.status}`);
    }

    // Check draft expiry
    if (app.status === ApplicationStatus.DRAFT && dayjs().isAfter(dayjs(app.draftExpiresAt))) {
      await this.appRepo.update(app.id, { status: ApplicationStatus.EXPIRED });
      throw new BadRequestException('Application draft has expired');
    }

    // Run auto-reject rules
    const autoRejectResult = await this.checkAutoRejectRules(app);
    if (autoRejectResult.reject) {
      return await this.autoRejectApplication(app, autoRejectResult.reason, userId, ip);
    }

    // Determine approval level based on amount
    const matrix = await this.getApprovalMatrix(app.requestedAmount, app.productId);
    if (!matrix) throw new BadRequestException('No approval matrix configured for this amount');

    const targetStatus = `PENDING_L${matrix.level}` as ApplicationStatus;
    const slaDeadline = dayjs().add(matrix.slaHours, 'hour').toDate();

    // Transition state
    await this.dataSource.transaction(async (manager) => {
      const fromStatus = app.status;
      await manager.update(LoanApplication, app.id, {
        status: targetStatus,
        currentLevel: matrix.level,
        submittedAt: app.submittedAt || new Date(),
        slaDeadline,
        updatedBy: userId,
      });

      // Record workflow event
      await manager.save(ApprovalWorkflow, {
        applicationId: app.id,
        level: matrix.level,
        actorId: userId,
        action: ApprovalAction.APPROVE, // Use as "SUBMIT" action
        fromStatus,
        toStatus: targetStatus,
        comment: 'Application submitted for approval',
        actorIp: ip,
        slaHours: matrix.slaHours,
      });

      // Queue notification to approver
      await manager.save(Notification, {
        applicationId: app.id,
        recipientType: 'APPROVER_GROUP',
        channel: NotificationChannel.EMAIL,
        subject: `New loan application pending review — ${app.applicationNumber}`,
        message: `Application ${app.applicationNumber} requires your review at Level ${matrix.level}. Amount: ${app.requestedAmount.toLocaleString()} THB. SLA Deadline: ${slaDeadline.toLocaleString('th-TH')}.`,
        recipientAddress: 'approver@los.local',
        status: NotificationStatus.PENDING,
        metadata: { applicationId: app.id, level: matrix.level, slaDeadline },
      });
    });

    await this.auditRepo.save(
      this.auditRepo.create({
        action: AuditAction.APPLICATION_SUBMIT,
        actorId: userId,
        resourceType: 'LoanApplication',
        resourceId: app.id,
        newValue: { status: targetStatus, level: matrix.level },
        ipAddress: ip,
        result: 'SUCCESS',
      }),
    );

    return {
      applicationId: app.id,
      applicationNumber: app.applicationNumber,
      status: targetStatus,
      currentLevel: matrix.level,
      slaDeadline,
    };
  }

  async processApprovalAction(
    applicationId: string,
    dto: ApprovalActionDto,
    actorId: string,
    ip: string,
  ) {
    const app = await this.appRepo.findOne({
      where: { id: applicationId },
      relations: ['product'],
    });

    if (!app) throw new NotFoundException('Application not found');

    // Verify actor has permission for this level
    const { effectiveActorId, isDelegated, delegatedById } =
      await this.resolveActor(actorId, app.currentLevel);

    // Validate action
    await this.validateApprovalAction(app, dto.action, effectiveActorId);

    const result = await this.dataSource.transaction(async (manager) => {
      let newStatus: ApplicationStatus;
      let auditAction: AuditAction;

      switch (dto.action) {
        case ApprovalAction.APPROVE:
          newStatus = await this.determineApproveStatus(app);
          auditAction = AuditAction.APPLICATION_APPROVE;
          break;
        case ApprovalAction.REJECT:
          if (!dto.reason) throw new BadRequestException('Rejection reason is required');
          newStatus = ApplicationStatus.REJECTED;
          auditAction = AuditAction.APPLICATION_REJECT;
          break;
        case ApprovalAction.RETURN:
          if (!dto.reason) throw new BadRequestException('Return reason is required');
          newStatus = ApplicationStatus.RETURNED;
          auditAction = AuditAction.APPLICATION_RETURN;
          break;
        case ApprovalAction.ESCALATE:
          newStatus = `PENDING_L${app.currentLevel + 1}` as ApplicationStatus;
          auditAction = AuditAction.APPLICATION_APPROVE;
          break;
        default:
          throw new BadRequestException(`Unknown action: ${dto.action}`);
      }

      // Compute next SLA if still pending
      let slaDeadline = app.slaDeadline;
      let nextLevel = app.currentLevel;
      if (newStatus.startsWith('PENDING_L')) {
        const nextLevelNum = parseInt(newStatus.replace('PENDING_L', ''), 10);
        const nextMatrix = await this.matrixRepo.findOne({ where: { level: nextLevelNum, isActive: true } });
        if (nextMatrix) {
          slaDeadline = dayjs().add(nextMatrix.slaHours, 'hour').toDate();
          nextLevel = nextLevelNum;
        }
      }

      const updateData: Partial<LoanApplication> = {
        status: newStatus,
        currentLevel: newStatus.startsWith('PENDING_L') ? nextLevel : null,
        slaDeadline,
        updatedBy: actorId,
      };

      if (newStatus === ApplicationStatus.APPROVED) {
        updateData.approvedAt = new Date();
        updateData.approvedAmount = dto.approvedAmount || app.requestedAmount;
      }
      if (newStatus === ApplicationStatus.REJECTED) {
        updateData.rejectedAt = new Date();
        updateData.rejectionReason = dto.reason;
      }
      if (newStatus === ApplicationStatus.RETURNED) {
        updateData.returnReason = dto.reason;
      }

      await manager.update(LoanApplication, app.id, updateData);

      // Immutable workflow record
      await manager.save(ApprovalWorkflow, {
        applicationId: app.id,
        level: app.currentLevel,
        actorId: effectiveActorId,
        delegatedById: isDelegated ? delegatedById : null,
        isDelegated,
        action: dto.action,
        fromStatus: app.status,
        toStatus: newStatus,
        comment: dto.comment,
        reason: dto.reason,
        actorIp: ip,
      });

      // Notify Sale System & customer on final decision
      if ([ApplicationStatus.APPROVED, ApplicationStatus.REJECTED].includes(newStatus)) {
        await manager.save(Notification, {
          applicationId: app.id,
          recipientType: 'SALE_SYSTEM',
          channel: NotificationChannel.EMAIL,
          subject: `Loan application ${newStatus} — ${app.applicationNumber}`,
          message: `Application ${app.applicationNumber} has been ${newStatus.toLowerCase()}.${dto.reason ? ` Reason: ${dto.reason}` : ''}`,
          recipientAddress: 'sale@los.local',
          status: NotificationStatus.PENDING,
          metadata: { applicationId: app.id, status: newStatus, callbackUrl: app.callbackUrl },
        });
      }

      return { status: newStatus, level: nextLevel };
    });

    await this.auditRepo.save(
      this.auditRepo.create({
        action: AuditAction.APPLICATION_APPROVE,
        actorId,
        resourceType: 'LoanApplication',
        resourceId: app.id,
        newValue: { action: dto.action, status: result.status },
        ipAddress: ip,
        result: 'SUCCESS',
      }),
    );

    return {
      applicationId: app.id,
      applicationNumber: app.applicationNumber,
      action: dto.action,
      status: result.status,
      currentLevel: result.level,
    };
  }

  async getApplicationQueue(actorId: string, level: number) {
    return this.appRepo
      .createQueryBuilder('app')
      .innerJoinAndSelect('app.customer', 'customer')
      .innerJoinAndSelect('app.product', 'product')
      .where('app.current_level = :level', { level })
      .andWhere('app.status = :status', { status: `PENDING_L${level}` })
      .orderBy('app.sla_deadline', 'ASC')
      .select([
        'app.id', 'app.applicationNumber', 'app.status', 'app.requestedAmount',
        'app.currentLevel', 'app.slaDeadline', 'app.slaBreached', 'app.createdAt',
        'customer.nameTh', 'product.nameTh',
      ])
      .getMany();
  }

  async getApplicationDetail(applicationId: string, actorId: string) {
    const app = await this.appRepo.findOne({
      where: { id: applicationId },
      relations: ['customer', 'product', 'workflows', 'scores', 'answers'],
    });
    if (!app) throw new NotFoundException('Application not found');
    return app;
  }

  private async determineApproveStatus(app: LoanApplication): Promise<ApplicationStatus> {
    // Check if current level needs escalation to next level based on amount
    const nextMatrix = await this.matrixRepo.findOne({
      where: { level: app.currentLevel + 1, isActive: true },
      order: { level: 'ASC' },
    });

    if (nextMatrix && app.requestedAmount > nextMatrix.minAmount && app.currentLevel < 7) {
      return `PENDING_L${app.currentLevel + 1}` as ApplicationStatus;
    }

    return ApplicationStatus.APPROVED;
  }

  private async getApprovalMatrix(amount: number, productId: string) {
    return this.matrixRepo
      .createQueryBuilder('m')
      .where('m.is_active = true')
      .andWhere(':amount >= m.min_amount', { amount })
      .andWhere(':amount <= m.max_amount', { amount })
      .andWhere('(m.product_id IS NULL OR m.product_id = :productId)', { productId })
      .orderBy('m.level', 'ASC')
      .getOne();
  }

  private async checkAutoRejectRules(app: LoanApplication): Promise<{ reject: boolean; reason?: string }> {
    if (app.blacklistMatched) {
      return { reject: true, reason: 'Customer is on blacklist' };
    }

    // Get criteria for this product
    const criteria = await this.criteriaRepo
      .createQueryBuilder('c')
      .where('c.is_active = true')
      .andWhere('(c.product_id IS NULL OR c.product_id = :productId)', { productId: app.productId })
      .andWhere('c.effective_from <= NOW()')
      .andWhere('(c.effective_to IS NULL OR c.effective_to > NOW())')
      .getOne();

    if (!criteria || !criteria.autoRejectRules) return { reject: false };

    // Score-based reject
    const latestScore = await this.scoreRepo.findOne({
      where: { applicationId: app.id },
      order: { createdAt: 'DESC' },
    });

    if (latestScore && criteria.minCreditScore) {
      if (latestScore.totalScore < criteria.minCreditScore) {
        return { reject: true, reason: `Credit score ${latestScore.totalScore} below minimum ${criteria.minCreditScore}` };
      }
    }

    return { reject: false };
  }

  private async autoRejectApplication(
    app: LoanApplication, reason: string, userId: string, ip: string,
  ) {
    await this.dataSource.transaction(async (manager) => {
      await manager.update(LoanApplication, app.id, {
        status: ApplicationStatus.AUTO_REJECTED,
        rejectionReason: reason,
        rejectedAt: new Date(),
        autoRejectReason: reason,
        updatedBy: userId,
      });

      await manager.save(ApprovalWorkflow, {
        applicationId: app.id,
        level: 0,
        actorId: null,
        action: ApprovalAction.AUTO_REJECT,
        fromStatus: app.status,
        toStatus: ApplicationStatus.AUTO_REJECTED,
        reason,
        actorIp: ip,
      });
    });

    return {
      applicationId: app.id,
      applicationNumber: app.applicationNumber,
      status: ApplicationStatus.AUTO_REJECTED,
      reason,
    };
  }

  private async resolveActor(
    actorId: string, level: number,
  ): Promise<{ effectiveActorId: string; isDelegated: boolean; delegatedById: string }> {
    // Check if this user has an active delegation (is acting on behalf of someone)
    const delegation = await this.delegationRepo
      .createQueryBuilder('d')
      .where('d.delegate_id = :actorId', { actorId })
      .andWhere('d.is_active = true')
      .andWhere('d.start_date <= NOW()')
      .andWhere('d.end_date > NOW()')
      .getOne();

    if (delegation) {
      return { effectiveActorId: actorId, isDelegated: true, delegatedById: delegation.delegatorId };
    }

    return { effectiveActorId: actorId, isDelegated: false, delegatedById: null };
  }

  private async validateApprovalAction(
    app: LoanApplication,
    action: ApprovalAction,
    actorId: string,
  ) {
    if (!app.status.startsWith('PENDING_L')) {
      throw new BadRequestException(`Cannot act on application in status: ${app.status}`);
    }

    const validActions = [ApprovalAction.APPROVE, ApprovalAction.REJECT, ApprovalAction.RETURN, ApprovalAction.ESCALATE];
    if (!validActions.includes(action)) {
      throw new BadRequestException(`Invalid action: ${action}`);
    }

    // Cannot escalate past L7
    if (action === ApprovalAction.ESCALATE && app.currentLevel >= 7) {
      throw new BadRequestException('Cannot escalate beyond Level 7');
    }
  }
}
