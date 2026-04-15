import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MasterController } from './master.controller';
import { MasterService } from './master.service';
import { Product } from '../../database/entities/product.entity';
import { Question } from '../../database/entities/question.entity';
import { FormTemplate } from '../../database/entities/form-template.entity';
import { ScoringModel } from '../../database/entities/scoring-model.entity';
import { ApprovalMatrix } from '../../database/entities/approval-matrix.entity';
import { ApprovalCriteria } from '../../database/entities/approval-criteria.entity';
import { Customer } from '../../database/entities/customer.entity';
import { Blacklist } from '../../database/entities/blacklist.entity';
import { AuditLog } from '../../database/entities/audit-log.entity';

@Module({
  imports: [TypeOrmModule.forFeature([
    Product, Question, FormTemplate, ScoringModel,
    ApprovalMatrix, ApprovalCriteria, Customer, Blacklist, AuditLog,
  ])],
  controllers: [MasterController],
  providers: [MasterService],
  exports: [MasterService],
})
export class MasterModule {}
