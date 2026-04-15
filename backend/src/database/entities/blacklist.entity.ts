import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn,
  UpdateDateColumn, Index,
} from 'typeorm';
import { BlacklistType } from '../../common/enums';

@Entity('blacklists')
export class Blacklist {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'type', type: 'varchar', length: 30, enum: BlacklistType })
  type: BlacklistType;

  @Column({ name: 'value_hash', type: 'char', length: 64 })
  @Index()
  valueHash: string; // SHA-256 of the actual value

  @Column({ name: 'value_masked', type: 'varchar', length: 255 })
  valueMasked: string; // Masked for display

  @Column({ name: 'reason', type: 'text' })
  reason: string;

  @Column({ name: 'source', type: 'varchar', length: 100, nullable: true })
  source: string;

  @Column({ name: 'effective_from', type: 'timestamptz', default: () => 'NOW()' })
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
