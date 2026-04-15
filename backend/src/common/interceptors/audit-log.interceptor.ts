import {
  Injectable, NestInterceptor, ExecutionContext, CallHandler,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLog } from '../../database/entities/audit-log.entity';
import { AuditAction } from '../enums';

@Injectable()
export class AuditLogInterceptor implements NestInterceptor {
  constructor(
    private reflector: Reflector,
    @InjectRepository(AuditLog)
    private readonly auditRepo: Repository<AuditLog>,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const action = this.reflector.get<AuditAction>('auditAction', context.getHandler());
    if (!action) return next.handle();

    const request = context.switchToHttp().getRequest();
    const user = request.user;
    const startTime = Date.now();

    return next.handle().pipe(
      tap({
        next: (data) => {
          this.writeLog(action, user, request, 'SUCCESS', null).catch(() => {});
        },
        error: (error) => {
          this.writeLog(action, user, request, 'FAILURE', error.message).catch(() => {});
        },
      }),
    );
  }

  private async writeLog(
    action: AuditAction,
    user: any,
    request: any,
    result: string,
    errorMessage: string,
  ) {
    const log = this.auditRepo.create({
      action,
      actorId: user?.id,
      actorUsername: user?.username,
      actorRole: user?.primaryRole,
      ipAddress: request.headers['x-forwarded-for']?.split(',')[0] || request.socket.remoteAddress,
      userAgent: request.headers['user-agent'],
      result,
      errorMessage,
      metadata: {
        method: request.method,
        url: request.url,
        body: this.sanitizeBody(request.body),
      },
    });
    await this.auditRepo.save(log);
  }

  private sanitizeBody(body: any): any {
    if (!body) return body;
    const sanitized = { ...body };
    const sensitiveFields = ['password', 'passwordHash', 'mfaSecret', 'nationalId', 'token'];
    sensitiveFields.forEach((field) => {
      if (field in sanitized) sanitized[field] = '[REDACTED]';
    });
    return sanitized;
  }
}
