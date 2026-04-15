import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Product } from '../../database/entities/product.entity';
import { Question } from '../../database/entities/question.entity';
import { FormTemplate } from '../../database/entities/form-template.entity';
import { ScoringModel } from '../../database/entities/scoring-model.entity';
import { ApprovalMatrix } from '../../database/entities/approval-matrix.entity';
import { ApprovalCriteria } from '../../database/entities/approval-criteria.entity';
import { Customer } from '../../database/entities/customer.entity';
import { Blacklist } from '../../database/entities/blacklist.entity';
import { AuditLog } from '../../database/entities/audit-log.entity';
import { AuditAction, BlacklistType, UserRole } from '../../common/enums';
import { hash, maskNationalId } from '../../common/utils/crypto.util';

@Injectable()
export class MasterService {
  private readonly logger = new Logger(MasterService.name);

  constructor(
    @InjectRepository(Product) private productRepo: Repository<Product>,
    @InjectRepository(Question) private questionRepo: Repository<Question>,
    @InjectRepository(FormTemplate) private formRepo: Repository<FormTemplate>,
    @InjectRepository(ScoringModel) private scoringRepo: Repository<ScoringModel>,
    @InjectRepository(ApprovalMatrix) private matrixRepo: Repository<ApprovalMatrix>,
    @InjectRepository(ApprovalCriteria) private criteriaRepo: Repository<ApprovalCriteria>,
    @InjectRepository(Customer) private customerRepo: Repository<Customer>,
    @InjectRepository(Blacklist) private blacklistRepo: Repository<Blacklist>,
    @InjectRepository(AuditLog) private auditRepo: Repository<AuditLog>,
  ) {}

  // Products
  async listProducts() {
    return this.productRepo.find({ order: { createdAt: 'DESC' } });
  }

  async createProduct(dto: any, actorId: string) {
    const product = this.productRepo.create({ ...dto, createdBy: actorId });
    return this.productRepo.save(product);
  }

  async updateProduct(id: string, dto: any, actorId: string) {
    const existing = await this.productRepo.findOne({ where: { id } });
    if (!existing) throw new NotFoundException('Product not found');
    await this.productRepo.update(id, { ...dto, updatedBy: actorId });
    return this.productRepo.findOne({ where: { id } });
  }

  // Questions
  async listQuestions() {
    return this.questionRepo.find({
      relations: ['category', 'options'],
      where: { isActive: true },
      order: { displayOrder: 'ASC' },
    });
  }

  async createQuestion(dto: any, actorId: string) {
    const question = this.questionRepo.create({ ...dto, createdBy: actorId });
    return this.questionRepo.save(question);
  }

  async updateQuestion(id: string, dto: any, actorId: string) {
    const existing = await this.questionRepo.findOne({ where: { id } });
    if (!existing) throw new NotFoundException('Question not found');

    // If question is active and in use, create new version
    if (existing.isActive) {
      const newVersion = this.questionRepo.create({
        ...existing,
        id: undefined,
        ...dto,
        version: existing.version + 1,
        parentQuestionCode: existing.questionCode,
        createdBy: actorId,
      });
      // Deactivate old version
      await this.questionRepo.update(id, { isActive: false });
      return this.questionRepo.save(newVersion);
    }

    await this.questionRepo.update(id, { ...dto, updatedBy: actorId });
    return this.questionRepo.findOne({ where: { id } });
  }

  // Form Templates
  async listFormTemplates() {
    return this.formRepo.find({
      relations: ['formQuestions', 'formQuestions.question'],
      order: { createdAt: 'DESC' },
    });
  }

  async createFormTemplate(dto: any, actorId: string) {
    const template = this.formRepo.create({ ...dto, createdBy: actorId });
    return this.formRepo.save(template);
  }

  // Scoring Models
  async listScoringModels() {
    return this.scoringRepo.find({ relations: ['rules'], order: { createdAt: 'DESC' } });
  }

  async createScoringModel(dto: any, actorId: string) {
    const model = this.scoringRepo.create({ ...dto, createdBy: actorId });
    return this.scoringRepo.save(model);
  }

  // Approval Matrix
  async listApprovalMatrix() {
    return this.matrixRepo.find({ order: { level: 'ASC' } });
  }

  async updateApprovalMatrix(id: string, dto: any, actorId: string) {
    const existing = await this.matrixRepo.findOne({ where: { id } });
    if (!existing) throw new NotFoundException('Approval matrix entry not found');

    await this.auditRepo.save(
      this.auditRepo.create({
        action: AuditAction.APPROVAL_MATRIX_CHANGE,
        actorId,
        resourceType: 'ApprovalMatrix',
        resourceId: id,
        oldValue: { level: existing.level, minAmount: existing.minAmount, maxAmount: existing.maxAmount },
        newValue: dto,
        result: 'SUCCESS',
      }),
    );

    await this.matrixRepo.update(id, { ...dto, updatedBy: actorId });
    return this.matrixRepo.findOne({ where: { id } });
  }

  // Approval Criteria
  async listApprovalCriteria() {
    return this.criteriaRepo.find({ where: { isActive: true }, order: { createdAt: 'DESC' } });
  }

  async createApprovalCriteria(dto: any, actorId: string) {
    const criteria = this.criteriaRepo.create({ ...dto, createdBy: actorId });
    return this.criteriaRepo.save(criteria);
  }

  // Customers — data access with masking
  async searchCustomers(query: string, actorRole: string) {
    if (!query || query.length < 3) return [];

    const queryHash = hash(query.trim());
    const results = await this.customerRepo
      .createQueryBuilder('c')
      .where('c.national_id_hash = :hash', { hash: queryHash })
      .orWhere('c.phone_hash = :hash', { hash: queryHash })
      .orWhere('c.name_th ILIKE :name', { name: `%${query}%` })
      .orderBy('c.created_at', 'DESC')
      .take(20)
      .getMany();

    // Apply role-based data masking
    const sensitiveRoles: string[] = [UserRole.ADMIN, UserRole.AUDIT];
    const showFull = sensitiveRoles.includes(actorRole);

    return results.map((c) => ({
      id: c.id,
      nameTh: c.nameTh,
      nameEn: c.nameEn,
      nationalIdMasked: showFull ? '(Decryption required — audit log required)' : maskNationalId('XXXXXXXXXX123'),
      phoneMasked: c.phoneMasked,
      emailMasked: c.emailMasked,
      isBlacklisted: c.isBlacklisted,
      createdAt: c.createdAt,
    }));
  }

  // Blacklist
  async listBlacklist() {
    return this.blacklistRepo.find({ where: { isActive: true }, order: { createdAt: 'DESC' } });
  }

  async addToBlacklist(dto: any, actorId: string) {
    const entry = this.blacklistRepo.create({
      type: dto.type as BlacklistType,
      valueHash: hash(dto.value),
      valueMasked: this.maskBlacklistValue(dto.type, dto.value),
      reason: dto.reason,
      source: dto.source,
      effectiveFrom: dto.effectiveFrom ? new Date(dto.effectiveFrom) : new Date(),
      effectiveTo: dto.effectiveTo ? new Date(dto.effectiveTo) : null,
      isActive: true,
      createdBy: actorId,
    });
    return this.blacklistRepo.save(entry);
  }

  async removeFromBlacklist(id: string, actorId: string) {
    await this.blacklistRepo.update(id, { isActive: false, updatedBy: actorId });
    return { success: true };
  }

  private maskBlacklistValue(type: string, value: string): string {
    if (type === BlacklistType.NATIONAL_ID) return maskNationalId(value);
    if (type === BlacklistType.PHONE) {
      const d = value.replace(/\D/g, '');
      return `0XX-XXX-${d.slice(-4)}`;
    }
    const parts = value.split(' ');
    return parts.map((p) => `${p[0]}***`).join(' ');
  }
}
