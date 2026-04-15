import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn,
} from 'typeorm';

@Entity('approval_criteria')
export class ApprovalCriteria {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'product_id', type: 'uuid', nullable: true })
  productId: string;

  @Column({ name: 'name', type: 'varchar', length: 255 })
  name: string;

  @Column({ name: 'min_credit_score', type: 'decimal', precision: 10, scale: 2, nullable: true })
  minCreditScore: number;

  @Column({ name: 'max_dsr', type: 'decimal', precision: 5, scale: 2, nullable: true })
  maxDsr: number; // Debt Service Ratio %

  @Column({ name: 'min_employment_months', type: 'int', nullable: true })
  minEmploymentMonths: number;

  @Column({ name: 'allowed_employment_types', type: 'jsonb', nullable: true })
  allowedEmploymentTypes: string[];

  @Column({ name: 'auto_reject_rules', type: 'jsonb', nullable: true })
  autoRejectRules: Array<{
    condition: string;
    reason: string;
  }>;

  @Column({ name: 'auto_approve_rules', type: 'jsonb', nullable: true })
  autoApproveRules: Array<{
    condition: string;
    maxAmount: number;
  }>;

  @Column({ name: 'version', type: 'int', default: 1 })
  version: number;

  @Column({ name: 'effective_from', type: 'timestamptz' })
  effectiveFrom: Date;

  @Column({ name: 'effective_to', type: 'timestamptz', nullable: true })
  effectiveTo: Date;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @Column({ name: 'created_by', type: 'varchar', length: 100 })
  createdBy: string;

  @Column({ name: 'updated_by', type: 'varchar', length: 100, nullable: true })
  updatedBy: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
