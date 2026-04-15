import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn,
  ManyToOne, JoinColumn, Index,
} from 'typeorm';
import { LoanApplication } from './loan-application.entity';
import { User } from './user.entity';
import { ApprovalAction, ApplicationStatus } from '../../common/enums';

// Immutable — no UPDATE or DELETE allowed on this table
@Entity('approval_workflows')
export class ApprovalWorkflow {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'application_id', type: 'uuid' })
  @Index()
  applicationId: string;

  @ManyToOne(() => LoanApplication, (app) => app.workflows)
  @JoinColumn({ name: 'application_id' })
  application: LoanApplication;

  @Column({ name: 'level', type: 'int' })
  level: number; // 1-7

  @Column({ name: 'actor_id', type: 'uuid', nullable: true })
  actorId: string;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'actor_id' })
  actor: User;

  @Column({ name: 'delegated_by_id', type: 'uuid', nullable: true })
  delegatedById: string;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'delegated_by_id' })
  delegatedBy: User;

  @Column({ name: 'is_delegated', type: 'boolean', default: false })
  isDelegated: boolean;

  @Column({ name: 'action', type: 'varchar', length: 20, enum: ApprovalAction })
  action: ApprovalAction;

  @Column({ name: 'from_status', type: 'varchar', length: 30, enum: ApplicationStatus })
  fromStatus: ApplicationStatus;

  @Column({ name: 'to_status', type: 'varchar', length: 30, enum: ApplicationStatus })
  toStatus: ApplicationStatus;

  @Column({ type: 'text', nullable: true })
  comment: string;

  @Column({ type: 'text', nullable: true })
  reason: string;

  @Column({ name: 'is_committee_vote', type: 'boolean', default: false })
  isCommitteeVote: boolean;

  @Column({ name: 'voted_approve', type: 'boolean', nullable: true })
  votedApprove: boolean; // For L7 committee vote

  @Column({ name: 'quorum_required', type: 'int', nullable: true })
  quorumRequired: number;

  @Column({ name: 'quorum_current', type: 'int', nullable: true })
  quorumCurrent: number;

  @Column({ name: 'actor_ip', type: 'inet', nullable: true })
  actorIp: string;

  @Column({ name: 'sla_hours', type: 'decimal', precision: 10, scale: 2, nullable: true })
  slaHours: number;

  @Column({ name: 'metadata', type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
  // NOTE: No updated_at, no deleted_at — immutable record
}
