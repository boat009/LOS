import {
  Injectable, BadRequestException, ConflictException, Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import * as dayjs from 'dayjs';
import { LoanApplication } from '../../database/entities/loan-application.entity';
import { Customer } from '../../database/entities/customer.entity';
import { Product } from '../../database/entities/product.entity';
import { AuditLog } from '../../database/entities/audit-log.entity';
import { Blacklist } from '../../database/entities/blacklist.entity';
import { ApplicationStatus, AuditAction, BlacklistType } from '../../common/enums';
import {
  encrypt, hash, maskNationalId, maskPhone, maskEmail,
} from '../../common/utils/crypto.util';
import { generateApplicationNumber, validateNationalId } from '../../common/utils/application-id.util';
import { CreateApplicationDto } from './dto/create-application.dto';

@Injectable()
export class IntegrationService {
  private readonly logger = new Logger(IntegrationService.name);

  constructor(
    @InjectRepository(LoanApplication) private appRepo: Repository<LoanApplication>,
    @InjectRepository(Customer) private customerRepo: Repository<Customer>,
    @InjectRepository(Product) private productRepo: Repository<Product>,
    @InjectRepository(AuditLog) private auditRepo: Repository<AuditLog>,
    @InjectRepository(Blacklist) private blacklistRepo: Repository<Blacklist>,
    private config: ConfigService,
  ) {}

  async createApplication(dto: CreateApplicationDto, saleUserId: string, ip: string) {
    // 1. Validate National ID format + checksum
    if (!validateNationalId(dto.nationalId)) {
      throw new BadRequestException('Invalid National ID format or checksum');
    }

    // 2. Validate ID expiry date
    if (dto.idExpiryDate && dayjs(dto.idExpiryDate).isBefore(dayjs())) {
      throw new BadRequestException('National ID card is expired');
    }

    // 3. Check for duplicate pending application
    const nationalIdHash = hash(dto.nationalId);
    const existingCustomer = await this.customerRepo.findOne({
      where: { nationalIdHash },
    });

    if (existingCustomer) {
      const pendingApp = await this.appRepo.findOne({
        where: {
          customerId: existingCustomer.id,
          status: ApplicationStatus.PENDING_L1, // Active statuses
        },
      });

      // Broaden check to all active statuses
      const activePendingStatuses = [
        ApplicationStatus.DRAFT,
        ApplicationStatus.SUBMITTED,
        ApplicationStatus.PENDING_L1,
        ApplicationStatus.PENDING_L2,
        ApplicationStatus.PENDING_L3,
        ApplicationStatus.PENDING_L4,
        ApplicationStatus.PENDING_L5,
        ApplicationStatus.PENDING_L6,
        ApplicationStatus.PENDING_L7,
        ApplicationStatus.RETURNED,
        ApplicationStatus.RESUBMITTED,
      ];

      const existingApp = await this.appRepo
        .createQueryBuilder('app')
        .where('app.customer_id = :customerId', { customerId: existingCustomer.id })
        .andWhere('app.status IN (:...statuses)', { statuses: activePendingStatuses })
        .andWhere('app.deleted_at IS NULL')
        .getOne();

      if (existingApp) {
        return {
          status: 'DUPLICATE',
          applicationId: existingApp.id,
          applicationNumber: existingApp.applicationNumber,
          message: 'Duplicate application found',
        };
      }
    }

    // 4. Validate product
    const product = await this.productRepo.findOne({ where: { id: dto.productId, status: 'ACTIVE' as any } });
    if (!product) throw new BadRequestException('Product not found or inactive');

    // 5. Validate amount range
    if (dto.requestedAmount < product.minAmount || dto.requestedAmount > product.maxAmount) {
      throw new BadRequestException(
        `Requested amount must be between ${product.minAmount} and ${product.maxAmount}`,
      );
    }

    // 6. Upsert customer
    const customer = await this.upsertCustomer(dto, nationalIdHash, saleUserId);

    // 7. Check blacklist
    const isBlacklisted = await this.checkBlacklist(nationalIdHash);

    // 8. Generate application number
    const applicationNumber = generateApplicationNumber();

    // 9. Compute draft expiry (72 hours)
    const draftExpiresAt = dayjs().add(72, 'hour').toDate();

    // 10. Create application
    const app = this.appRepo.create({
      applicationNumber,
      customerId: customer.id,
      productId: dto.productId,
      requestedAmount: dto.requestedAmount,
      status: ApplicationStatus.DRAFT,
      saleUserId,
      saleSystemRef: dto.saleSystemRef,
      formTemplateId: product.formTemplateId,
      blacklistMatched: isBlacklisted,
      draftExpiresAt,
      sourceIp: ip,
      callbackUrl: dto.callbackUrl,
      createdBy: saleUserId,
    });

    const saved = await this.appRepo.save(app);

    // 11. Audit log
    await this.auditRepo.save(
      this.auditRepo.create({
        action: AuditAction.APPLICATION_CREATE,
        actorId: saleUserId,
        resourceType: 'LoanApplication',
        resourceId: saved.id,
        newValue: { applicationNumber, productId: dto.productId, requestedAmount: dto.requestedAmount },
        ipAddress: ip,
        result: 'SUCCESS',
      }),
    );

    this.logger.log(`Application created: ${applicationNumber}`);

    return {
      status: 'CREATED',
      applicationId: saved.id,
      applicationNumber: saved.applicationNumber,
      customerId: customer.id,
      blacklistMatched: isBlacklisted,
      draftExpiresAt,
      message: isBlacklisted
        ? 'Application created — blacklist match detected, pending approver review'
        : 'Application created successfully',
    };
  }

  async getApplicationStatus(applicationId: string, requesterId: string) {
    const app = await this.appRepo.findOne({
      where: { id: applicationId },
      relations: ['product'],
    });

    if (!app) throw new BadRequestException('Application not found');

    return {
      applicationId: app.id,
      applicationNumber: app.applicationNumber,
      status: app.status,
      currentLevel: app.currentLevel,
      submittedAt: app.submittedAt,
      approvedAt: app.approvedAt,
      rejectedAt: app.rejectedAt,
      approvedAmount: app.approvedAmount,
      rejectionReason: app.rejectionReason,
      product: app.product?.nameTh,
    };
  }

  private async upsertCustomer(dto: CreateApplicationDto, nationalIdHash: string, userId: string): Promise<Customer> {
    let customer = await this.customerRepo.findOne({ where: { nationalIdHash } });

    if (!customer) {
      customer = this.customerRepo.create({
        nationalIdEncrypted: encrypt(dto.nationalId),
        nationalIdHash,
        nameTh: dto.nameTh,
        nameEn: dto.nameEn,
        dateOfBirthEncrypted: dto.dateOfBirth ? encrypt(dto.dateOfBirth) : null,
        idExpiryDateEncrypted: dto.idExpiryDate ? encrypt(dto.idExpiryDate) : null,
        phoneMasked: dto.phone ? maskPhone(dto.phone) : null,
        phoneHash: dto.phone ? hash(dto.phone) : null,
        emailMasked: dto.email ? maskEmail(dto.email) : null,
        address: dto.address,
        province: dto.province,
        employmentType: dto.employmentType,
        employerName: dto.employerName,
        employmentDurationMonths: dto.employmentDurationMonths,
        monthlyIncomeEncrypted: dto.monthlyIncome ? encrypt(String(dto.monthlyIncome)) : null,
        pdpaConsentDate: dto.pdpaConsent ? new Date() : null,
        createdBy: userId,
      });
      customer = await this.customerRepo.save(customer);
    } else {
      // Update non-PII fields if provided
      await this.customerRepo.update(customer.id, {
        nameTh: dto.nameTh || customer.nameTh,
        address: dto.address || customer.address,
        updatedBy: userId,
      });
    }

    return customer;
  }

  private async checkBlacklist(nationalIdHash: string): Promise<boolean> {
    const count = await this.blacklistRepo
      .createQueryBuilder('b')
      .where('b.type = :type', { type: BlacklistType.NATIONAL_ID })
      .andWhere('b.value_hash = :hash', { hash: nationalIdHash })
      .andWhere('b.is_active = true')
      .andWhere('(b.effective_to IS NULL OR b.effective_to > NOW())')
      .getCount();

    return count > 0;
  }
}
