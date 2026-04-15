import {
  ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus, Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const traceId = uuidv4();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';
    let code = 'INTERNAL_ERROR';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse() as any;
      message = typeof exceptionResponse === 'string'
        ? exceptionResponse
        : exceptionResponse.message || message;
      code = exceptionResponse.code || `HTTP_${status}`;
    }

    // Never expose stack traces or internal details in production
    const isDev = process.env.NODE_ENV === 'development';

    this.logger.error(
      `[${traceId}] ${request.method} ${request.url} - ${status} - ${message}`,
      isDev && exception instanceof Error ? exception.stack : undefined,
    );

    response.status(status).json({
      status: 'error',
      code,
      message,
      traceId,
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }
}
