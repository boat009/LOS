import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn,
  UpdateDateColumn, DeleteDateColumn, OneToMany, Index,
} from 'typeorm';
import { LoanApplication } from './loan-application.entity';

@Entity('customers')
export class Customer {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // AES-256 encrypted at DB level via column transformer
  @Column({ name: 'national_id_encrypted', type: 'text' })
  nationalIdEncrypted: string;

  @Column({ name: 'national_id_hash', type: 'char', length: 64 })
  @Index({ unique: true })
  nationalIdHash: string; // SHA-256 for lookup

  @Column({ name: 'name_th', type: 'varchar', length: 255 })
  nameTh: string;

  @Column({ name: 'name_en', type: 'varchar', length: 255, nullable: true })
  nameEn: string;

  @Column({ name: 'date_of_birth_encrypted', type: 'text', nullable: true })
  dateOfBirthEncrypted: string;

  @Column({ name: 'id_issue_date_encrypted', type: 'text', nullable: true })
  idIssueDateEncrypted: string;

  @Column({ name: 'id_expiry_date_encrypted', type: 'text', nullable: true })
  idExpiryDateEncrypted: string;

  @Column({ name: 'phone_masked', type: 'varchar', length: 20, nullable: true })
  phoneMasked: string;

  @Column({ name: 'phone_hash', type: 'char', length: 64, nullable: true })
  phoneHash: string;

  @Column({ name: 'email_masked', type: 'varchar', length: 255, nullable: true })
  emailMasked: string;

  @Column({ type: 'text', nullable: true })
  address: string;

  @Column({ type: 'text', nullable: true })
  province: string;

  @Column({ name: 'employment_type', type: 'varchar', length: 100, nullable: true })
  employmentType: string;

  @Column({ name: 'employer_name', type: 'varchar', length: 255, nullable: true })
  employerName: string;

  @Column({ name: 'employment_duration_months', type: 'int', nullable: true })
  employmentDurationMonths: number;

  @Column({ name: 'monthly_income_encrypted', type: 'text', nullable: true })
  monthlyIncomeEncrypted: string;

  @Column({ name: 'is_blacklisted', type: 'boolean', default: false })
  isBlacklisted: boolean;

  @Column({ name: 'blacklist_reason', type: 'text', nullable: true })
  blacklistReason: string;

  @Column({ name: 'pdpa_consent_date', type: 'timestamptz', nullable: true })
  pdpaConsentDate: Date;

  @Column({ name: 'pdpa_anonymized_at', type: 'timestamptz', nullable: true })
  pdpaAnonymizedAt: Date;

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

  @OneToMany(() => LoanApplication, (app) => app.customer)
  loanApplications: LoanApplication[];
}
