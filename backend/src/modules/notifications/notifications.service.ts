import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import * as nodemailer from 'nodemailer';
import { ConfigService } from '@nestjs/config';
import { Notification } from '../../database/entities/notification.entity';
import { NotificationStatus, NotificationChannel } from '../../common/enums';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);
  private transporter: nodemailer.Transporter;

  constructor(
    @InjectRepository(Notification) private notifRepo: Repository<Notification>,
    private config: ConfigService,
  ) {
    this.transporter = nodemailer.createTransport({
      host: config.get('smtp.host'),
      port: config.get('smtp.port'),
      auth: {
        user: config.get('smtp.user'),
        pass: config.get('smtp.pass'),
      },
    });
  }

  @Cron(CronExpression.EVERY_MINUTE)
  async processNotificationQueue() {
    const pending = await this.notifRepo.find({
      where: { status: NotificationStatus.PENDING },
      take: 50,
      order: { createdAt: 'ASC' },
    });

    for (const notif of pending) {
      try {
        if (notif.channel === NotificationChannel.EMAIL) {
          await this.sendEmail(notif);
        } else if (notif.channel === NotificationChannel.SMS) {
          await this.sendSms(notif);
        }

        await this.notifRepo.update(notif.id, {
          status: NotificationStatus.SENT,
          sentAt: new Date(),
        });
      } catch (err) {
        const retryCount = notif.retryCount + 1;
        const nextRetryAt = new Date(Date.now() + retryCount * 5 * 60 * 1000); // exponential backoff

        await this.notifRepo.update(notif.id, {
          retryCount,
          errorMessage: err.message,
          status: retryCount >= 3 ? NotificationStatus.FAILED : NotificationStatus.PENDING,
          nextRetryAt,
        });

        this.logger.error(`Notification failed: ${notif.id} — ${err.message}`);
      }
    }
  }

  async getNotificationHistory(applicationId: string) {
    return this.notifRepo.find({
      where: { applicationId },
      order: { createdAt: 'DESC' },
    });
  }

  private async sendEmail(notif: Notification) {
    const smtpHost = this.config.get('smtp.host');
    if (!smtpHost || smtpHost === 'localhost') {
      // Skip in development
      this.logger.debug(`[DEV] Email to ${notif.recipientAddress}: ${notif.subject}`);
      return;
    }

    await this.transporter.sendMail({
      from: this.config.get('smtp.from'),
      to: notif.recipientAddress,
      subject: notif.subject,
      html: this.buildEmailHtml(notif.message),
    });

    this.logger.log(`Email sent to ${notif.recipientAddress}: ${notif.subject}`);
  }

  private async sendSms(notif: Notification) {
    const apiUrl = this.config.get('sms.apiUrl');
    if (!apiUrl) {
      this.logger.debug(`[DEV] SMS to ${notif.recipientAddress}: ${notif.message}`);
      return;
    }
    // Integration point for SMS gateway (e.g. DTAC, AIS Business)
    this.logger.log(`SMS queued for ${notif.recipientAddress}`);
  }

  private buildEmailHtml(message: string): string {
    return `
      <!DOCTYPE html>
      <html>
      <head><meta charset="utf-8"></head>
      <body style="font-family: Arial, sans-serif; color: #333; padding: 20px;">
        <div style="max-width: 600px; margin: 0 auto;">
          <div style="background: #2E75B6; color: white; padding: 16px 24px; border-radius: 4px 4px 0 0;">
            <h2 style="margin: 0;">ระบบ Loan Origination System</h2>
          </div>
          <div style="border: 1px solid #ddd; padding: 24px; border-radius: 0 0 4px 4px;">
            <p>${message.replace(/\n/g, '<br>')}</p>
            <hr style="border-top: 1px solid #eee;">
            <p style="color: #666; font-size: 12px;">
              อีเมลนี้ส่งโดยอัตโนมัติจากระบบ LOS กรุณาอย่าตอบกลับ
            </p>
          </div>
        </div>
      </body>
      </html>
    `;
  }
}
