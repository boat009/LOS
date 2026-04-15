import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as ExcelJS from 'exceljs';
import { LoanApplication } from '../../database/entities/loan-application.entity';
import { ApprovalWorkflow } from '../../database/entities/approval-workflow.entity';
import { AuditLog } from '../../database/entities/audit-log.entity';
import { ApplicationStatus } from '../../common/enums';

@Injectable()
export class ReportsService {
  private readonly logger = new Logger(ReportsService.name);

  constructor(
    @InjectRepository(LoanApplication) private appRepo: Repository<LoanApplication>,
    @InjectRepository(ApprovalWorkflow) private workflowRepo: Repository<ApprovalWorkflow>,
    @InjectRepository(AuditLog) private auditRepo: Repository<AuditLog>,
  ) {}

  async getDashboard() {
    const statuses = Object.values(ApplicationStatus);
    const statusCounts = await this.appRepo
      .createQueryBuilder('app')
      .select('app.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .groupBy('app.status')
      .getRawMany();

    const levelQueues = await this.appRepo
      .createQueryBuilder('app')
      .select('app.current_level', 'level')
      .addSelect('COUNT(*)', 'count')
      .addSelect('SUM(app.requested_amount)', 'totalAmount')
      .where('app.status LIKE :pattern', { pattern: 'PENDING_L%' })
      .groupBy('app.current_level')
      .orderBy('app.current_level', 'ASC')
      .getRawMany();

    const slaBreachedCount = await this.appRepo.count({ where: { slaBreached: true } as any });

    const todayApproved = await this.appRepo
      .createQueryBuilder('app')
      .where('app.status = :status', { status: ApplicationStatus.APPROVED })
      .andWhere('DATE(app.approved_at) = CURRENT_DATE')
      .getCount();

    const todayRejected = await this.appRepo
      .createQueryBuilder('app')
      .where('app.status = :status', { status: ApplicationStatus.REJECTED })
      .andWhere('DATE(app.rejected_at) = CURRENT_DATE')
      .getCount();

    return {
      statusSummary: statusCounts,
      levelQueues,
      slaBreachedCount,
      today: { approved: todayApproved, rejected: todayRejected },
      generatedAt: new Date(),
    };
  }

  async getApplicationReport(from: string, to: string, status?: ApplicationStatus) {
    const query = this.appRepo
      .createQueryBuilder('app')
      .innerJoinAndSelect('app.product', 'product')
      .where('app.created_at BETWEEN :from AND :to', { from, to });

    if (status) query.andWhere('app.status = :status', { status });

    const apps = await query
      .select([
        'app.id', 'app.applicationNumber', 'app.status', 'app.requestedAmount',
        'app.approvedAmount', 'app.currentLevel', 'app.createdAt', 'app.submittedAt',
        'app.approvedAt', 'app.rejectedAt', 'app.slaBreached',
        'product.nameTh', 'product.productCode',
      ])
      .orderBy('app.created_at', 'DESC')
      .getMany();

    return apps;
  }

  async getSlaReport(from: string, to: string) {
    return this.appRepo
      .createQueryBuilder('app')
      .where('app.submitted_at BETWEEN :from AND :to', { from, to })
      .select([
        'app.applicationNumber', 'app.currentLevel', 'app.slaDeadline',
        'app.slaBreached', 'app.status',
      ])
      .orderBy('app.sla_deadline', 'ASC')
      .getMany();
  }

  async exportToExcel(from: string, to: string): Promise<Buffer> {
    const apps = await this.getApplicationReport(from, to);

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'LOS System';
    workbook.created = new Date();

    const sheet = workbook.addWorksheet('Loan Applications');

    // Header styling
    sheet.columns = [
      { header: 'Application No.', key: 'appNo', width: 22 },
      { header: 'Status', key: 'status', width: 18 },
      { header: 'Product', key: 'product', width: 20 },
      { header: 'Requested Amount', key: 'requestedAmount', width: 18 },
      { header: 'Approved Amount', key: 'approvedAmount', width: 18 },
      { header: 'Current Level', key: 'level', width: 14 },
      { header: 'SLA Breached', key: 'slaBreached', width: 14 },
      { header: 'Created At', key: 'createdAt', width: 22 },
      { header: 'Approved At', key: 'approvedAt', width: 22 },
    ];

    // Style header row
    sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    sheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2E75B6' } };

    apps.forEach((app) => {
      sheet.addRow({
        appNo: app.applicationNumber,
        status: app.status,
        product: (app as any).product?.nameTh,
        requestedAmount: app.requestedAmount,
        approvedAmount: app.approvedAmount,
        level: app.currentLevel,
        slaBreached: app.slaBreached ? 'YES' : 'NO',
        createdAt: app.createdAt?.toISOString(),
        approvedAt: app.approvedAt?.toISOString(),
      });
    });

    // Number format for amounts
    sheet.getColumn('requestedAmount').numFmt = '#,##0.00';
    sheet.getColumn('approvedAmount').numFmt = '#,##0.00';

    return workbook.xlsx.writeBuffer() as Promise<Buffer>;
  }

  async getApproverPerformance(from: string, to: string) {
    return this.workflowRepo
      .createQueryBuilder('w')
      .innerJoinAndSelect('w.actor', 'actor')
      .where('w.created_at BETWEEN :from AND :to', { from, to })
      .select([
        'actor.username', 'actor.nameTh',
        'w.level', 'w.action',
      ])
      .addSelect('COUNT(*)', 'count')
      .groupBy('actor.id, actor.username, actor.nameTh, w.level, w.action')
      .getRawMany();
  }
}
