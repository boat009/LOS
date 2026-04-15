import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn,
  UpdateDateColumn, ManyToOne, OneToMany, JoinColumn, Index,
} from 'typeorm';
import { Customer } from './customer.entity';
import { Product } from './product.entity';
import { User } from './user.entity';
import { ApprovalWorkflow } from './approval-workflow.entity';
import { Answer } from './answer.entity';
import { ApplicationScore } from './application-score.entity';
import { ApplicationStatus } from '../../common/enums';

@Entity('loan_applications')
export class LoanApplication {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'application_number', type: 'varchar', length: 30, unique: true })
  @Index({ unique: true })
  applicationNumber: string; // LOS-YYYYMMDD-XXXXXXXX

  @Column({ name: 'customer_id', type: 'uuid' })
  customerId: string;

  @ManyToOne(() => Customer, (c) => c.loanApplications)
  @JoinColumn({ name: 'customer_id' })
  customer: Customer;

  @Column({ name: 'product_id', type: 'uuid' })
  productId: string;

  @ManyToOne(() => Product)
  @JoinColumn({ name: 'product_id' })
  product: Product;

  @Column({ name: 'requested_amount', type: 'decimal', precision: 15, scale: 2 })
  requestedAmount: number;

  @Column({ name: 'approved_amount', type: 'decimal', precision: 15, scale: 2, nullable: true })
  approvedAmount: number;

  @Column({
    type: 'varchar',
    length: 30,
    enum: ApplicationStatus,
    default: ApplicationStatus.DRAFT,
  })
  @Index()
  status: ApplicationStatus;

  @Column({ name: 'current_level', type: 'int', nullable: true })
  currentLevel: number; // 1-7

  @Column({ name: 'current_approver_id', type: 'uuid', nullable: true })
  currentApproverId: string;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'current_approver_id' })
  currentApprover: User;

  @Column({ name: 'sale_user_id', type: 'uuid' })
  saleUserId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'sale_user_id' })
  saleUser: User;

  @Column({ name: 'sale_system_ref', type: 'varchar', length: 100, nullable: true })
  saleSystemRef: string; // Reference ID from Sale System

  @Column({ name: 'form_template_id', type: 'uuid', nullable: true })
  formTemplateId: string;

  @Column({ name: 'form_version', type: 'int', nullable: true })
  formVersion: number;

  @Column({ name: 'rejection_reason', type: 'text', nullable: true })
  rejectionReason: string;

  @Column({ name: 'return_reason', type: 'text', nullable: true })
  returnReason: string;

  @Column({ name: 'blacklist_matched', type: 'boolean', default: false })
  blacklistMatched: boolean;

  @Column({ name: 'auto_reject_reason', type: 'text', nullable: true })
  autoRejectReason: string;

  @Column({ name: 'sla_deadline', type: 'timestamptz', nullable: true })
  slaDeadline: Date;

  @Column({ name: 'sla_breached', type: 'boolean', default: false })
  slaBreached: boolean;

  @Column({ name: 'submitted_at', type: 'timestamptz', nullable: true })
  submittedAt: Date;

  @Column({ name: 'approved_at', type: 'timestamptz', nullable: true })
  approvedAt: Date;

  @Column({ name: 'rejected_at', type: 'timestamptz', nullable: true })
  rejectedAt: Date;

  @Column({ name: 'draft_expires_at', type: 'timestamptz', nullable: true })
  draftExpiresAt: Date;

  @Column({ name: 'source_ip', type: 'inet', nullable: true })
  sourceIp: string;

  @Column({ name: 'callback_url', type: 'text', nullable: true })
  callbackUrl: string;

  @Column({ name: 'callback_sent_at', type: 'timestamptz', nullable: true })
  callbackSentAt: Date;

  @Column({ name: 'metadata', type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  @Column({ name: 'created_by', type: 'varchar', length: 100 })
  createdBy: string;

  @Column({ name: 'updated_by', type: 'varchar', length: 100, nullable: true })
  updatedBy: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  @OneToMany(() => ApprovalWorkflow, (w) => w.application)
  workflows: ApprovalWorkflow[];

  @OneToMany(() => Answer, (a) => a.application)
  answers: Answer[];

  @OneToMany(() => ApplicationScore, (s) => s.application)
  scores: ApplicationScore[];
}
