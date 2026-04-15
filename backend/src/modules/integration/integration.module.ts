import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { IntegrationController } from './integration.controller';
import { IntegrationService } from './integration.service';
import { LoanApplication } from '../../database/entities/loan-application.entity';
import { Customer } from '../../database/entities/customer.entity';
import { Product } from '../../database/entities/product.entity';
import { AuditLog } from '../../database/entities/audit-log.entity';
import { Blacklist } from '../../database/entities/blacklist.entity';

@Module({
  imports: [TypeOrmModule.forFeature([LoanApplication, Customer, Product, AuditLog, Blacklist])],
  controllers: [IntegrationController],
  providers: [IntegrationService],
  exports: [IntegrationService],
})
export class IntegrationModule {}
