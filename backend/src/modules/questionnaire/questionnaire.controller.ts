import {
  Controller, Get, Post, Put, Body, Param, UseGuards,
  UploadedFile, UseInterceptors, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiConsumes } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { QuestionnaireService } from './questionnaire.service';
import { SaveAnswersDto } from './dto/save-answers.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CurrentUser, ClientIp, Roles } from '../../common/decorators';
import { UserRole } from '../../common/enums';

@ApiTags('Questionnaire')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('api/v1/questionnaire')
export class QuestionnaireController {
  constructor(private readonly questionnaireService: QuestionnaireService) {}

  @Get('applications/:id/form')
  @Roles(UserRole.SALE, UserRole.ADMIN)
  @ApiOperation({ summary: 'Get questionnaire form for an application' })
  async getForm(@Param('id') id: string, @CurrentUser() user: any) {
    return this.questionnaireService.getForm(id, user.id);
  }

  @Post('applications/:id/answers')
  @HttpCode(HttpStatus.OK)
  @Roles(UserRole.SALE, UserRole.ADMIN)
  @ApiOperation({ summary: 'Save answers (final or draft)' })
  async saveAnswers(
    @Param('id') id: string,
    @Body() dto: SaveAnswersDto,
    @CurrentUser() user: any,
    @ClientIp() ip: string,
  ) {
    return this.questionnaireService.saveAnswers(id, dto, user.id, ip);
  }

  @Put('applications/:id/draft')
  @HttpCode(HttpStatus.OK)
  @Roles(UserRole.SALE, UserRole.ADMIN)
  @ApiOperation({ summary: 'Save draft answers (auto-save)' })
  async saveDraft(
    @Param('id') id: string,
    @Body() dto: SaveAnswersDto,
    @CurrentUser() user: any,
    @ClientIp() ip: string,
  ) {
    dto.isDraft = true;
    return this.questionnaireService.saveAnswers(id, dto, user.id, ip);
  }
}
