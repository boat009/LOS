import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index,
} from 'typeorm';
import { AuditAction } from '../../common/enums';

// Immutable — no UPDATE or DELETE allowed
@Entity('audit_logs')
export class AuditLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'action', type: 'varchar', length: 50, enum: AuditAction })
  @Index()
  action: AuditAction;

  @Column({ name: 'actor_id', type: 'uuid', nullable: true })
  @Index()
  actorId: string;

  @Column({ name: 'actor_username', type: 'varchar', length: 100, nullable: true })
  actorUsername: string;

  @Column({ name: 'actor_role', type: 'varchar', length: 50, nullable: true })
  actorRole: string;

  @Column({ name: 'resource_type', type: 'varchar', length: 100, nullable: true })
  resourceType: string;

  @Column({ name: 'resource_id', type: 'varchar', length: 100, nullable: true })
  @Index()
  resourceId: string;

  @Column({ name: 'old_value', type: 'jsonb', nullable: true })
  oldValue: Record<string, any>; // PII masked before writing

  @Column({ name: 'new_value', type: 'jsonb', nullable: true })
  newValue: Record<string, any>; // PII masked before writing

  @Column({ name: 'ip_address', type: 'inet', nullable: true })
  ipAddress: string;

  @Column({ name: 'user_agent', type: 'text', nullable: true })
  userAgent: string;

  @Column({ name: 'session_id', type: 'varchar', length: 100, nullable: true })
  sessionId: string;

  @Column({ name: 'result', type: 'varchar', length: 20, nullable: true })
  result: string; // SUCCESS, FAILURE

  @Column({ name: 'error_message', type: 'text', nullable: true })
  errorMessage: string;

  @Column({ name: 'metadata', type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  @Index()
  createdAt: Date;
  // NOTE: No updated_at, no deleted_at — immutable record
}
