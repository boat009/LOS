import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import * as helmet from 'helmet';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log', 'debug'],
  });

  const config = app.get(ConfigService);
  const port = config.get<number>('port') || 3000;
  const nodeEnv = config.get<string>('nodeEnv');

  // Security headers (SEC-LOS-011, SEC-LOS-013)
  app.use(
    (helmet as any)({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", 'data:'],
          connectSrc: ["'self'"],
          frameSrc: ["'none'"],
          objectSrc: ["'none'"],
        },
      },
      hsts: {
        maxAge: 31536000, // 1 year
        includeSubDomains: true,
        preload: true,
      },
      frameguard: { action: 'deny' },
      noSniff: true,
      xssFilter: true,
      referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
    }),
  );

  // CORS — restrict to known origins
  app.enableCors({
    origin: nodeEnv === 'development'
      ? true   // allow all origins in development (Docker local, Vite dev server, etc.)
      : (process.env.FRONTEND_URL
          ? [process.env.FRONTEND_URL]
          : ['http://localhost', 'http://localhost:8080']),
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-api-key', 'x-hmac-signature', 'x-timestamp'],
    credentials: true,
  });

  // Global validation pipe — server-side input validation (SEC-LOS-009)
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,         // Strip unknown properties
      forbidNonWhitelisted: false,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
      disableErrorMessages: nodeEnv === 'production', // Hide validation details in prod
    }),
  );

  // Swagger API docs (dev only)
  if (nodeEnv !== 'production') {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('Loan Origination System API')
      .setDescription('LOS Backend API — CMMI Level 3 + OWASP ASVS Level 2')
      .setVersion('1.0')
      .addBearerAuth()
      .addApiKey({ type: 'apiKey', name: 'x-api-key', in: 'header' }, 'ApiKey')
      .build();

    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('api/docs', app, document, {
      swaggerOptions: { persistAuthorization: true },
    });

    Logger.log(`Swagger docs: http://localhost:${port}/api/docs`, 'Bootstrap');
  }

  await app.listen(port);
  Logger.log(`LOS Backend started on port ${port} [${nodeEnv}]`, 'Bootstrap');
}

bootstrap().catch((err) => {
  Logger.error('Bootstrap failed', err);
  process.exit(1);
});
