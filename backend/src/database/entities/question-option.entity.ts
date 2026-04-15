import {
  Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn,
} from 'typeorm';
import { Question } from './question.entity';

@Entity('question_options')
export class QuestionOption {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'question_id', type: 'uuid' })
  questionId: string;

  @ManyToOne(() => Question, (q) => q.options)
  @JoinColumn({ name: 'question_id' })
  question: Question;

  @Column({ name: 'text_th', type: 'varchar', length: 500 })
  textTh: string;

  @Column({ name: 'text_en', type: 'varchar', length: 500, nullable: true })
  textEn: string;

  @Column({ name: 'value', type: 'varchar', length: 100 })
  value: string;

  @Column({ name: 'score', type: 'decimal', precision: 10, scale: 2, default: 0 })
  score: number; // Can be negative (penalty)

  @Column({ name: 'display_order', type: 'int', default: 0 })
  displayOrder: number;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
