import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn,
  UpdateDateColumn, ManyToOne, JoinColumn,
} from 'typeorm';
import { User } from './user.entity';

@Entity('approval_matrix')
export class ApprovalMatrix {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'level', type: 'int' })
  level: number; // 1-7

  @Column({ name: 'min_amount', type: 'decimal', precision: 15, scale: 2 })
  minAmount: number;

  @Column({ name: 'max_amount', type: 'decimal', precision: 15, scale: 2 })
  maxAmount: number;

  @Column({ name: 'role_name', type: 'varchar', length: 100 })
  roleName: string;

  @Column({ name: 'sla_hours', type: 'decimal', precision: 10, scale: 2 })
  slaHours: number;

  @Column({ name: 'escalation_level', type: 'int', nullable: true })
  escalationLevel: number;

  @Column({ name: 'product_id', type: 'uuid', nullable: true })
  productId: string;

  @Column({ name: 'quorum_required', type: 'int', nullable: true })
  quorumRequired: number; // For L7 committee

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
