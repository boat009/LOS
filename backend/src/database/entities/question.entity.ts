import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn,
  UpdateDateColumn, DeleteDateColumn, ManyToOne, OneToMany, JoinColumn,
} from 'typeorm';
import { QuestionCategory } from './question-category.entity';
import { QuestionOption } from './question-option.entity';
import { QuestionType } from '../../common/enums';

@Entity('questions')
export class Question {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'question_code', type: 'varchar', length: 50, unique: true })
  questionCode: string;

  @Column({ name: 'category_id', type: 'uuid', nullable: true })
  categoryId: string;

  @ManyToOne(() => QuestionCategory, { nullable: true })
  @JoinColumn({ name: 'category_id' })
  category: QuestionCategory;

  @Column({ name: 'text_th', type: 'text' })
  textTh: string;

  @Column({ name: 'text_en', type: 'text', nullable: true })
  textEn: string;

  @Column({ name: 'type', type: 'varchar', length: 30, enum: QuestionType })
  type: QuestionType;

  @Column({ name: 'is_required', type: 'boolean', default: true })
  isRequired: boolean;

  @Column({ name: 'version', type: 'int', default: 1 })
  version: number;

  @Column({ name: 'parent_question_code', type: 'varchar', length: 50, nullable: true })
  parentQuestionCode: string; // For versioning

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @Column({ name: 'validation_rules', type: 'jsonb', nullable: true })
  validationRules: Record<string, any>; // min, max, regex, etc.

  @Column({ name: 'conditional_logic', type: 'jsonb', nullable: true })
  conditionalLogic: Record<string, any>; // show/skip based on other answers

  @Column({ name: 'help_text', type: 'text', nullable: true })
  helpText: string;

  @Column({ name: 'display_order', type: 'int', default: 0 })
  displayOrder: number;

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

  @OneToMany(() => QuestionOption, (opt) => opt.question, { cascade: true })
  options: QuestionOption[];
}
