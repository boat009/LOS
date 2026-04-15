import {
  Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn,
} from 'typeorm';
import { ScoringModel } from './scoring-model.entity';

@Entity('scoring_rules')
export class ScoringRule {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'scoring_model_id', type: 'uuid' })
  scoringModelId: string;

  @ManyToOne(() => ScoringModel, (m) => m.rules)
  @JoinColumn({ name: 'scoring_model_id' })
  scoringModel: ScoringModel;

  @Column({ name: 'question_id', type: 'uuid', nullable: true })
  questionId: string;

  @Column({ name: 'rule_type', type: 'varchar', length: 50 })
  ruleType: string; // ANSWER_SCORE, RANGE_SCORE, FORMULA

  @Column({ name: 'condition', type: 'jsonb' })
  condition: Record<string, any>;

  @Column({ name: 'score', type: 'decimal', precision: 10, scale: 2 })
  score: number;

  @Column({ name: 'weight', type: 'decimal', precision: 5, scale: 2, default: 1.0 })
  weight: number;

  @Column({ name: 'category', type: 'varchar', length: 100, nullable: true })
  category: string;

  @Column({ name: 'display_order', type: 'int', default: 0 })
  displayOrder: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
