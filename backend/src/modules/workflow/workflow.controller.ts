import {
  Controller, Post, Get, Body, Param, UseGuards, HttpCode, HttpStatus, Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { WorkflowService } from './workflow.service';
import { ApprovalActionDto } from './dto/approval-action.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CurrentUser, ClientIp, Roles } from '../../common/decorators';
import { UserRole } from '../../common/enums';

@ApiTags('Workflow - Approval')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('api/v1/workflow')
export class WorkflowController {
  constructor(private readonly workflowService: WorkflowService) {}

  @Post('applications/:id/submit')
  @HttpCode(HttpStatus.OK)
  @Roles(UserRole.SALE)
  @ApiOperation({ summary: 'Submit application to approval workflow' })
  async submit(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @ClientIp() ip: string,
  ) {
    return this.workflowService.submitApplication(id, user.id, ip);
  }

  @Post('applications/:id/action')
  @HttpCode(HttpStatus.OK)
  @Roles(
    UserRole.CREDIT_OFFICER, UserRole.SENIOR_CREDIT_OFFICER,
    UserRole.CREDIT_SUPERVISOR, UserRole.CREDIT_MANAGER,
    UserRole.CREDIT_DIRECTOR, UserRole.VP_CREDIT, UserRole.CREDIT_COMMITTEE,
  )
  @ApiOperation({ summary: 'Approve / Reject / Return / Escalate application' })
  async action(
    @Param('id') id: string,
    @Body() dto: ApprovalActionDto,
    @CurrentUser() user: any,
    @ClientIp() ip: string,
  ) {
    return this.workflowService.processApprovalAction(id, dto, user.id, ip);
  }

  @Get('queue')
  @ApiOperation({ summary: 'Get approval queue for current approver level' })
  async getQueue(@CurrentUser() user: any) {
    return this.workflowService.getApplicationQueue(user.id, user.approvalLevel);
  }

  @Get('applications/:id')
  @ApiOperation({ summary: 'Get full application detail for review' })
  async getDetail(@Param('id') id: string, @CurrentUser() user: any) {
    return this.workflowService.getApplicationDetail(id, user.id);
  }
}
