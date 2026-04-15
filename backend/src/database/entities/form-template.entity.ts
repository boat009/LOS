import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn,
  UpdateDateColumn, DeleteDateColumn, OneToMany,
} from 'typeorm';
import { FormQuestion } from './form-question.entity';

@Entity('form_templates')
export class FormTemplate {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'name_th', type: 'varchar', length: 255 })
  nameTh: string;

  @Column({ name: 'name_en', type: 'varchar', length: 255, nullable: true })
  nameEn: string;

  @Column({ name: 'product_id', type: 'uuid', nullable: true })
  productId: string;

  @Column({ name: 'version', type: 'int', default: 1 })
  version: number;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

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

  @OneToMany(() => FormQuestion, (fq) => fq.formTemplate, { cascade: true })
  formQuestions: FormQuestion[];
}
