import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn,
  UpdateDateColumn, ManyToOne, JoinColumn,
} from 'typeorm';
import { User } from './user.entity';

@Entity('user_delegations')
export class UserDelegation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'delegator_id', type: 'uuid' })
  delegatorId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'delegator_id' })
  delegator: User;

  @Column({ name: 'delegate_id', type: 'uuid' })
  delegateId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'delegate_id' })
  delegate: User;

  @Column({ name: 'start_date', type: 'timestamptz' })
  startDate: Date;

  @Column({ name: 'end_date', type: 'timestamptz' })
  endDate: Date;

  @Column({ name: 'reason', type: 'text', nullable: true })
  reason: string;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @Column({ name: 'created_by', type: 'varchar', length: 100 })
  createdBy: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
