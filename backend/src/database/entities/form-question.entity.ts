import {
  Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn,
} from 'typeorm';
import { FormTemplate } from './form-template.entity';
import { Question } from './question.entity';

@Entity('form_questions')
export class FormQuestion {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'form_template_id', type: 'uuid' })
  formTemplateId: string;

  @ManyToOne(() => FormTemplate, (ft) => ft.formQuestions)
  @JoinColumn({ name: 'form_template_id' })
  formTemplate: FormTemplate;

  @Column({ name: 'question_id', type: 'uuid' })
  questionId: string;

  @ManyToOne(() => Question)
  @JoinColumn({ name: 'question_id' })
  question: Question;

  @Column({ name: 'display_order', type: 'int', default: 0 })
  displayOrder: number;

  @Column({ name: 'is_required_override', type: 'boolean', nullable: true })
  isRequiredOverride: boolean;

  @Column({ name: 'conditional_logic', type: 'jsonb', nullable: true })
  conditionalLogic: Record<string, any>;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
