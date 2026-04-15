import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { QuestionnaireController } from './questionnaire.controller';
import { QuestionnaireService } from './questionnaire.service';
import { LoanApplication } from '../../database/entities/loan-application.entity';
import { FormTemplate } from '../../database/entities/form-template.entity';
import { Answer } from '../../database/entities/answer.entity';
import { Question } from '../../database/entities/question.entity';
import { AuditLog } from '../../database/entities/audit-log.entity';

@Module({
  imports: [TypeOrmModule.forFeature([LoanApplication, FormTemplate, Answer, Question, AuditLog])],
  controllers: [QuestionnaireController],
  providers: [QuestionnaireService],
  exports: [QuestionnaireService],
})
export class QuestionnaireModule {}
