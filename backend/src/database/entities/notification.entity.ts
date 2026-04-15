import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index,
} from 'typeorm';
import { NotificationChannel, NotificationStatus } from '../../common/enums';

@Entity('notifications')
export class Notification {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'application_id', type: 'uuid', nullable: true })
  @Index()
  applicationId: string;

  @Column({ name: 'recipient_id', type: 'uuid', nullable: true })
  recipientId: string;

  @Column({ name: 'recipient_type', type: 'varchar', length: 50 })
  recipientType: string; // USER, SALE_SYSTEM, CUSTOMER

  @Column({ name: 'channel', type: 'varchar', length: 20, enum: NotificationChannel })
  channel: NotificationChannel;

  @Column({ name: 'subject', type: 'varchar', length: 500, nullable: true })
  subject: string;

  @Column({ name: 'message', type: 'text' })
  message: string;

  @Column({ name: 'recipient_address', type: 'varchar', length: 255 })
  recipientAddress: string; // email or phone

  @Column({ name: 'status', type: 'varchar', length: 20, enum: NotificationStatus, default: NotificationStatus.PENDING })
  status: NotificationStatus;

  @Column({ name: 'sent_at', type: 'timestamptz', nullable: true })
  sentAt: Date;

  @Column({ name: 'error_message', type: 'text', nullable: true })
  errorMessage: string;

  @Column({ name: 'retry_count', type: 'int', default: 0 })
  retryCount: number;

  @Column({ name: 'next_retry_at', type: 'timestamptz', nullable: true })
  nextRetryAt: Date;

  @Column({ name: 'metadata', type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
