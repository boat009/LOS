import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as Minio from 'minio';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class MinioService {
  private readonly logger = new Logger(MinioService.name);
  private client: Minio.Client;
  private bucket: string;

  constructor(private config: ConfigService) {
    this.bucket = config.get('minio.bucket') || 'los-documents';
    this.client = new Minio.Client({
      endPoint: config.get('minio.endpoint') || 'localhost',
      port: config.get<number>('minio.port') || 9000,
      useSSL: config.get<boolean>('minio.useSSL') || false,
      accessKey: config.get('minio.accessKey') || 'los_minio_user',
      secretKey: config.get('minio.secretKey') || 'los_minio_password',
    });
  }

  async ensureBucket() {
    const exists = await this.client.bucketExists(this.bucket);
    if (!exists) {
      await this.client.makeBucket(this.bucket);
      this.logger.log(`Bucket "${this.bucket}" created`);
    }
  }

  async uploadFile(buffer: Buffer, originalName: string, mimeType: string): Promise<string> {
    await this.ensureBucket();
    const ext = originalName.split('.').pop();
    const objectName = `${uuidv4()}.${ext}`;

    // Validate mime type (SEC-LOS-012)
    const allowed = ['application/pdf', 'image/jpeg', 'image/png'];
    if (!allowed.includes(mimeType)) {
      throw new Error('File type not allowed. Only PDF, JPG, PNG accepted.');
    }

    // Validate magic bytes
    this.validateMagicBytes(buffer, mimeType);

    await this.client.putObject(this.bucket, objectName, buffer, buffer.length, {
      'Content-Type': mimeType,
      'x-amz-meta-original-name': originalName,
    });

    return objectName;
  }

  async getPresignedUrl(objectName: string, expiry = 3600): Promise<string> {
    return this.client.presignedGetObject(this.bucket, objectName, expiry);
  }

  async deleteFile(objectName: string) {
    await this.client.removeObject(this.bucket, objectName);
  }

  private validateMagicBytes(buffer: Buffer, mimeType: string) {
    const MAGIC: Record<string, number[]> = {
      'application/pdf': [0x25, 0x50, 0x44, 0x46], // %PDF
      'image/jpeg':      [0xFF, 0xD8, 0xFF],
      'image/png':       [0x89, 0x50, 0x4E, 0x47],
    };
    const expected = MAGIC[mimeType];
    if (!expected) throw new Error('Unsupported file type');
    for (let i = 0; i < expected.length; i++) {
      if (buffer[i] !== expected[i]) throw new Error('File content does not match declared type');
    }
  }
}
