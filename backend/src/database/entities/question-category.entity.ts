import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('question_categories')
export class QuestionCategory {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'name_th', type: 'varchar', length: 100 })
  nameTh: string;

  @Column({ name: 'name_en', type: 'varchar', length: 100, nullable: true })
  nameEn: string;

  @Column({ name: 'display_order', type: 'int', default: 0 })
  displayOrder: number;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
