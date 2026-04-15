import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LoanApplication } from '../../database/entities/loan-application.entity';
import { Notification } from '../../database/entities/notification.entity';
import { ApplicationStatus, NotificationChannel, NotificationStatus } from '../../common/enums';

@Injectable()
export class SlaMonitorService {
  private readonly logger = new Logger(SlaMonitorService.name);

  constructor(
    @InjectRepository(LoanApplication) private appRepo: Repository<LoanApplication>,
    @InjectRepository(Notification) private notifRepo: Repository<Notification>,
  ) {}

  @Cron(CronExpression.EVERY_30_MINUTES)
  async checkSlaBreaches() {
    this.logger.log('Running SLA breach check...');

    const breachedApps = await this.appRepo
      .createQueryBuilder('app')
      .where('app.sla_deadline < NOW()')
      .andWhere('app.sla_breached = false')
      .andWhere('app.status LIKE :pattern', { pattern: 'PENDING_L%' })
      .getMany();

    for (const app of breachedApps) {
      await this.appRepo.update(app.id, { slaBreached: true });

      // Queue escalation notification to supervisor
      await this.notifRepo.save(
        this.notifRepo.create({
          applicationId: app.id,
          recipientType: 'SUPERVISOR',
          channel: NotificationChannel.EMAIL,
          subject: `SLA BREACH — Application ${app.applicationNumber} overdue`,
          message: `Application ${app.applicationNumber} at Level ${app.currentLevel} has exceeded its SLA deadline of ${app.slaDeadline?.toLocaleString('th-TH')}. Immediate action required.`,
          recipientAddress: 'supervisor@los.local',
          status: NotificationStatus.PENDING,
          metadata: { applicationId: app.id, level: app.currentLevel, slaDeadline: app.slaDeadline },
        }),
      );

      this.logger.warn(`SLA breach detected: ${app.applicationNumber} at L${app.currentLevel}`);
    }

    // Expire draft applications
    const expiredDrafts = await this.appRepo
      .createQueryBuilder('app')
      .where('app.status = :status', { status: ApplicationStatus.DRAFT })
      .andWhere('app.draft_expires_at < NOW()')
      .getMany();

    for (const app of expiredDrafts) {
      await this.appRepo.update(app.id, { status: ApplicationStatus.EXPIRED });
      this.logger.log(`Draft expired: ${app.applicationNumber}`);
    }

    this.logger.log(`SLA check complete. Breaches: ${breachedApps.length}, Expired: ${expiredDrafts.length}`);
  }
}
