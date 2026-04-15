import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn, Index,
} from 'typeorm';
import { LoanApplication } from './loan-application.entity';
import { Question } from './question.entity';

@Entity('answers')
export class Answer {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'application_id', type: 'uuid' })
  @Index()
  applicationId: string;

  @ManyToOne(() => LoanApplication, (app) => app.answers)
  @JoinColumn({ name: 'application_id' })
  application: LoanApplication;

  @Column({ name: 'question_id', type: 'uuid' })
  questionId: string;

  @ManyToOne(() => Question)
  @JoinColumn({ name: 'question_id' })
  question: Question;

  @Column({ name: 'question_version', type: 'int' })
  questionVersion: number;

  @Column({ name: 'answer_value', type: 'jsonb' })
  answerValue: any; // string | string[] | number | Date

  @Column({ name: 'file_urls', type: 'jsonb', nullable: true })
  fileUrls: string[];

  @Column({ name: 'is_draft', type: 'boolean', default: false })
  isDraft: boolean;

  @Column({ name: 'filled_by_user_id', type: 'uuid' })
  filledByUserId: string;

  @Column({ name: 'filled_at', type: 'timestamptz' })
  filledAt: Date;

  @Column({ name: 'source_ip', type: 'inet', nullable: true })
  sourceIp: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
