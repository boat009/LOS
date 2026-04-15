import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn,
} from 'typeorm';
import { LoanApplication } from './loan-application.entity';
import { ScoringModel } from './scoring-model.entity';

@Entity('application_scores')
export class ApplicationScore {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'application_id', type: 'uuid' })
  applicationId: string;

  @ManyToOne(() => LoanApplication, (app) => app.scores)
  @JoinColumn({ name: 'application_id' })
  application: LoanApplication;

  @Column({ name: 'scoring_model_id', type: 'uuid' })
  scoringModelId: string;

  @ManyToOne(() => ScoringModel)
  @JoinColumn({ name: 'scoring_model_id' })
  scoringModel: ScoringModel;

  @Column({ name: 'total_score', type: 'decimal', precision: 10, scale: 2 })
  totalScore: number;

  @Column({ name: 'grade', type: 'varchar', length: 10 })
  grade: string;

  @Column({ name: 'score_breakdown', type: 'jsonb', nullable: true })
  scoreBreakdown: Record<string, any>;

  @Column({ name: 'recommendation', type: 'varchar', length: 20 })
  recommendation: string; // APPROVE, REVIEW, REJECT

  @Column({ name: 'max_approvable_amount', type: 'decimal', precision: 15, scale: 2, nullable: true })
  maxApprovableAmount: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
