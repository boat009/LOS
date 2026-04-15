import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn,
  UpdateDateColumn, DeleteDateColumn, ManyToMany, JoinTable, Index,
} from 'typeorm';
import { Role } from './role.entity';
import { UserRole } from '../../common/enums';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 100, unique: true })
  @Index({ unique: true })
  username: string;

  @Column({ name: 'password_hash', type: 'text' })
  passwordHash: string;

  @Column({ name: 'name_th', type: 'varchar', length: 255 })
  nameTh: string;

  @Column({ name: 'name_en', type: 'varchar', length: 255, nullable: true })
  nameEn: string;

  @Column({ name: 'email_masked', type: 'varchar', length: 255 })
  emailMasked: string;

  @Column({ name: 'email_hash', type: 'char', length: 64 })
  emailHash: string;

  @Column({ name: 'phone_masked', type: 'varchar', length: 20, nullable: true })
  phoneMasked: string;

  @Column({ name: 'phone_hash', type: 'char', length: 64, nullable: true })
  phoneHash: string;

  @Column({ name: 'employee_id', type: 'varchar', length: 50, nullable: true })
  employeeId: string;

  @Column({ name: 'department', type: 'varchar', length: 100, nullable: true })
  department: string;

  @Column({ name: 'primary_role', type: 'varchar', length: 50, enum: UserRole })
  primaryRole: UserRole;

  @Column({ name: 'approval_level', type: 'int', nullable: true })
  approvalLevel: number; // 1-7

  @Column({ name: 'max_approval_amount', type: 'decimal', precision: 15, scale: 2, nullable: true })
  maxApprovalAmount: number;

  @Column({ name: 'is_mfa_enabled', type: 'boolean', default: false })
  isMfaEnabled: boolean;

  @Column({ name: 'mfa_secret_encrypted', type: 'text', nullable: true })
  mfaSecretEncrypted: string; // TOTP secret, AES encrypted

  @Column({ name: 'mfa_type', type: 'varchar', length: 20, nullable: true })
  mfaType: string; // TOTP or SMS

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @Column({ name: 'failed_login_attempts', type: 'int', default: 0 })
  failedLoginAttempts: number;

  @Column({ name: 'locked_until', type: 'timestamptz', nullable: true })
  lockedUntil: Date;

  @Column({ name: 'password_changed_at', type: 'timestamptz', nullable: true })
  passwordChangedAt: Date;

  @Column({ name: 'password_expires_at', type: 'timestamptz', nullable: true })
  passwordExpiresAt: Date;

  @Column({ name: 'password_history', type: 'jsonb', default: [] })
  passwordHistory: string[]; // last 5 hashes

  @Column({ name: 'last_login_at', type: 'timestamptz', nullable: true })
  lastLoginAt: Date;

  @Column({ name: 'last_login_ip', type: 'inet', nullable: true })
  lastLoginIp: string;

  @Column({ name: 'admin_ip_whitelist', type: 'jsonb', default: [] })
  adminIpWhitelist: string[];

  @ManyToMany(() => Role, (role) => role.users, { eager: true })
  @JoinTable({
    name: 'user_roles',
    joinColumn: { name: 'user_id' },
    inverseJoinColumn: { name: 'role_id' },
  })
  roles: Role[];

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
