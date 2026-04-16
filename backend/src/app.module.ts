import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerModule } from '@nestjs/throttler';
import { ScheduleModule } from '@nestjs/schedule';
import { APP_GUARD, APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
import { RedisModule } from '@nestjs-modules/ioredis';

import configuration from './config/configuration';
import { AuthModule } from './modules/auth/auth.module';
import { IntegrationModule } from './modules/integration/integration.module';
import { QuestionnaireModule } from './modules/questionnaire/questionnaire.module';
import { WorkflowModule } from './modules/workflow/workflow.module';
import { UsersModule } from './modules/users/users.module';
import { MasterModule } from './modules/master/master.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { ReportsModule } from './modules/reports/reports.module';
import { MinioModule } from './modules/minio/minio.module';
import { AllExceptionsFilter } from './common/filters/http-exception.filter';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { RolesGuard } from './common/guards/roles.guard';
import { ThrottlerGuard } from '@nestjs/throttler';

// All entities
import {
  Customer, LoanApplication, Product, User, Role,
  ApprovalWorkflow, ApprovalMatrix, ApprovalCriteria,
  Question, QuestionCategory, QuestionOption,
  FormTemplate, FormQuestion, Answer,
  ScoringModel, ScoringRule, ApplicationScore,
  UserDelegation, Blacklist, Notification, AuditLog,
} from './database/entities';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
    }),

    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        url: config.get('database.url'),
        entities: [
          Customer, LoanApplication, Product, User, Role,
          ApprovalWorkflow, ApprovalMatrix, ApprovalCriteria,
          Question, QuestionCategory, QuestionOption,
          FormTemplate, FormQuestion, Answer,
          ScoringModel, ScoringRule, ApplicationScore,
          UserDelegation, Blacklist, Notification, AuditLog,
        ],
        synchronize: config.get('nodeEnv') === 'development', // Auto-sync in dev; use migrations in prod
        logging: config.get('nodeEnv') === 'development',
        ssl: config.get('nodeEnv') === 'production' ? { rejectUnauthorized: false } : false,
      }),
    }),

    ThrottlerModule.forRoot([
      {
        name: 'default',
        ttl: 60000,
        limit: 100,
      },
    ]),

    ScheduleModule.forRoot(),

    // Global Redis client (used by AuthService, JwtStrategy, etc.)
    RedisModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) =>
        ({
          type: 'single',
          url: config.get<string>('redis.url') || 'redis://localhost:6379',
        }) as any,
    }),

    MinioModule,
    AuthModule,
    IntegrationModule,
    QuestionnaireModule,
    WorkflowModule,
    UsersModule,
    MasterModule,
    NotificationsModule,
    ReportsModule,
  ],
  providers: [
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule {}
