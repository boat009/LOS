import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn,
  UpdateDateColumn, DeleteDateColumn, OneToMany,
} from 'typeorm';
import { ScoringRule } from './scoring-rule.entity';
import { ScoringModelType } from '../../common/enums';

@Entity('scoring_models')
export class ScoringModel {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'name_th', type: 'varchar', length: 255 })
  nameTh: string;

  @Column({ name: 'model_type', type: 'varchar', length: 30, enum: ScoringModelType })
  modelType: ScoringModelType;

  @Column({ name: 'version', type: 'int', default: 1 })
  version: number;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @Column({ name: 'grade_bands', type: 'jsonb' })
  gradeBands: Array<{
    grade: string;
    minScore: number;
    maxScore: number;
    maxLoanAmount: number;
    action: 'APPROVE' | 'REVIEW' | 'REJECT';
  }>;

  @Column({ name: 'description', type: 'text', nullable: true })
  description: string;

  @Column({ name: 'created_by', type: 'varchar', length: 100 })
  createdBy: string;

  @Column({ name: 'updated_by', type: 'varchar', length: 100, nullable: true })
  updatedBy: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  @DeleteDateColumn({ name: 'deleted_at', type: 'timestamptz' })
  deletedAt: Date;

  @OneToMany(() => ScoringRule, (rule) => rule.scoringModel, { cascade: true })
  rules: ScoringRule[];
}
