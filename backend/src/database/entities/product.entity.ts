import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn,
  UpdateDateColumn, DeleteDateColumn,
} from 'typeorm';
import { ProductStatus } from '../../common/enums';

@Entity('products')
export class Product {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'product_code', type: 'varchar', length: 50, unique: true })
  productCode: string;

  @Column({ name: 'name_th', type: 'varchar', length: 255 })
  nameTh: string;

  @Column({ name: 'name_en', type: 'varchar', length: 255, nullable: true })
  nameEn: string;

  @Column({ name: 'product_type', type: 'varchar', length: 100 })
  productType: string;

  @Column({ name: 'min_amount', type: 'decimal', precision: 15, scale: 2 })
  minAmount: number;

  @Column({ name: 'max_amount', type: 'decimal', precision: 15, scale: 2 })
  maxAmount: number;

  @Column({ name: 'min_interest_rate', type: 'decimal', precision: 5, scale: 2, nullable: true })
  minInterestRate: number;

  @Column({ name: 'max_interest_rate', type: 'decimal', precision: 5, scale: 2, nullable: true })
  maxInterestRate: number;

  @Column({ name: 'min_term_months', type: 'int', nullable: true })
  minTermMonths: number;

  @Column({ name: 'max_term_months', type: 'int', nullable: true })
  maxTermMonths: number;

  @Column({ name: 'form_template_id', type: 'uuid', nullable: true })
  formTemplateId: string;

  @Column({ name: 'scoring_model_id', type: 'uuid', nullable: true })
  scoringModelId: string;

  @Column({ name: 'approval_criteria_id', type: 'uuid', nullable: true })
  approvalCriteriaId: string;

  @Column({
    type: 'varchar',
    length: 20,
    enum: ProductStatus,
    default: ProductStatus.ACTIVE,
  })
  status: ProductStatus;

  @Column({ type: 'text', nullable: true })
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
}
