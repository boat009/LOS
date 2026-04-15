import {
  Injectable, NotFoundException, BadRequestException, Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LoanApplication } from '../../database/entities/loan-application.entity';
import { FormTemplate } from '../../database/entities/form-template.entity';
import { Answer } from '../../database/entities/answer.entity';
import { Question } from '../../database/entities/question.entity';
import { AuditLog } from '../../database/entities/audit-log.entity';
import { ApplicationStatus, AuditAction, QuestionType } from '../../common/enums';
import { SaveAnswersDto } from './dto/save-answers.dto';
import { MinioService } from '../minio/minio.service';

@Injectable()
export class QuestionnaireService {
  private readonly logger = new Logger(QuestionnaireService.name);

  constructor(
    @InjectRepository(LoanApplication) private appRepo: Repository<LoanApplication>,
    @InjectRepository(FormTemplate) private formRepo: Repository<FormTemplate>,
    @InjectRepository(Answer) private answerRepo: Repository<Answer>,
    @InjectRepository(Question) private questionRepo: Repository<Question>,
    @InjectRepository(AuditLog) private auditRepo: Repository<AuditLog>,
  ) {}

  async getForm(applicationId: string, userId: string) {
    const app = await this.appRepo.findOne({
      where: { id: applicationId },
      relations: ['product', 'customer'],
    });
    if (!app) throw new NotFoundException('Application not found');

    if (!app.formTemplateId) throw new BadRequestException('No form template assigned to this application');

    const form = await this.formRepo.findOne({
      where: { id: app.formTemplateId },
      relations: ['formQuestions', 'formQuestions.question', 'formQuestions.question.options'],
    });
    if (!form) throw new NotFoundException('Form template not found');

    // Get saved draft answers if any
    const draftAnswers = await this.answerRepo.find({
      where: { applicationId, isDraft: true },
    });
    const answersMap: Record<string, any> = {};
    draftAnswers.forEach((a) => { answersMap[a.questionId] = a.answerValue; });

    // Build ordered questions with pre-filled data
    const questions = form.formQuestions
      .sort((a, b) => a.displayOrder - b.displayOrder)
      .map((fq) => ({
        id: fq.question.id,
        code: fq.question.questionCode,
        textTh: fq.question.textTh,
        textEn: fq.question.textEn,
        type: fq.question.type,
        isRequired: fq.isRequiredOverride ?? fq.question.isRequired,
        options: fq.question.options?.sort((a, b) => a.displayOrder - b.displayOrder).map((o) => ({
          id: o.id,
          value: o.value,
          textTh: o.textTh,
          textEn: o.textEn,
        })),
        conditionalLogic: fq.conditionalLogic || fq.question.conditionalLogic,
        validationRules: fq.question.validationRules,
        helpText: fq.question.helpText,
        draftAnswer: answersMap[fq.question.id],
      }));

    return {
      applicationId,
      applicationNumber: app.applicationNumber,
      formId: form.id,
      formName: form.nameTh,
      questions,
      customer: {
        nameTh: app.customer?.nameTh,
        nationalIdMasked: 'X-XXXX-XXXXX-XX-X',
      },
      draftExpiresAt: app.draftExpiresAt,
    };
  }

  async saveAnswers(applicationId: string, dto: SaveAnswersDto, userId: string, ip: string) {
    const app = await this.appRepo.findOne({ where: { id: applicationId } });
    if (!app) throw new NotFoundException('Application not found');

    if (![ApplicationStatus.DRAFT, ApplicationStatus.RETURNED, ApplicationStatus.RESUBMITTED].includes(app.status)) {
      throw new BadRequestException(`Cannot modify application in status: ${app.status}`);
    }

    // Validate answers
    for (const answer of dto.answers) {
      const question = await this.questionRepo.findOne({
        where: { id: answer.questionId },
        relations: ['options'],
      });
      if (!question) throw new BadRequestException(`Question ${answer.questionId} not found`);

      await this.validateAnswer(question, answer.value);
    }

    // Delete existing draft answers for this application (upsert)
    if (dto.isDraft) {
      await this.answerRepo.delete({ applicationId, isDraft: true });
    } else {
      await this.answerRepo.delete({ applicationId });
    }

    // Save new answers
    const now = new Date();
    const answers = dto.answers.map((a) =>
      this.answerRepo.create({
        applicationId,
        questionId: a.questionId,
        questionVersion: 1,
        answerValue: a.value,
        fileUrls: a.fileUrls,
        isDraft: dto.isDraft || false,
        filledByUserId: userId,
        filledAt: now,
        sourceIp: ip,
      }),
    );

    await this.answerRepo.save(answers);

    // Audit log
    await this.auditRepo.save(
      this.auditRepo.create({
        action: AuditAction.ANSWER_SAVE,
        actorId: userId,
        resourceType: 'LoanApplication',
        resourceId: applicationId,
        newValue: { isDraft: dto.isDraft, answerCount: answers.length },
        ipAddress: ip,
        result: 'SUCCESS',
      }),
    );

    return {
      success: true,
      savedCount: answers.length,
      isDraft: dto.isDraft,
    };
  }

  private async validateAnswer(question: Question, value: any) {
    if (question.isRequired && (value === null || value === undefined || value === '')) {
      throw new BadRequestException(`Answer required for question: ${question.textTh}`);
    }

    const rules = question.validationRules;
    if (!rules) return;

    if (question.type === QuestionType.NUMBER) {
      const num = parseFloat(value);
      if (isNaN(num)) throw new BadRequestException(`Question ${question.questionCode}: must be a number`);
      if (rules.min !== undefined && num < rules.min) {
        throw new BadRequestException(`Question ${question.questionCode}: min value is ${rules.min}`);
      }
      if (rules.max !== undefined && num > rules.max) {
        throw new BadRequestException(`Question ${question.questionCode}: max value is ${rules.max}`);
      }
    }

    if (question.type === QuestionType.TEXT && rules.pattern) {
      const regex = new RegExp(rules.pattern);
      if (!regex.test(value)) {
        throw new BadRequestException(`Question ${question.questionCode}: invalid format`);
      }
    }

    if (question.type === QuestionType.SINGLE_CHOICE) {
      const validValues = question.options?.map((o) => o.value) || [];
      if (!validValues.includes(value)) {
        throw new BadRequestException(`Question ${question.questionCode}: invalid option`);
      }
    }
  }
}
