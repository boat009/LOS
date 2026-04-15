import {
  Controller, Get, Post, Put, Delete, Body, Param,
  UseGuards, Query, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { MasterService } from './master.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CurrentUser, Roles } from '../../common/decorators';
import { UserRole } from '../../common/enums';

@ApiTags('Master Data')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('api/v1/master')
export class MasterController {
  constructor(private readonly masterService: MasterService) {}

  // ─── Products ────────────────────────────────────────────────────────────
  @Get('products')
  @ApiOperation({ summary: 'List products' })
  async listProducts() { return this.masterService.listProducts(); }

  @Post('products')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Create product' })
  async createProduct(@Body() dto: any, @CurrentUser() u: any) {
    return this.masterService.createProduct(dto, u.id);
  }

  @Put('products/:id')
  @Roles(UserRole.ADMIN)
  async updateProduct(@Param('id') id: string, @Body() dto: any, @CurrentUser() u: any) {
    return this.masterService.updateProduct(id, dto, u.id);
  }

  // ─── Questions ────────────────────────────────────────────────────────────
  @Get('questions')
  @ApiOperation({ summary: 'List questions' })
  async listQuestions() { return this.masterService.listQuestions(); }

  @Post('questions')
  @Roles(UserRole.ADMIN)
  async createQuestion(@Body() dto: any, @CurrentUser() u: any) {
    return this.masterService.createQuestion(dto, u.id);
  }

  @Put('questions/:id')
  @Roles(UserRole.ADMIN)
  async updateQuestion(@Param('id') id: string, @Body() dto: any, @CurrentUser() u: any) {
    return this.masterService.updateQuestion(id, dto, u.id);
  }

  // ─── Form Templates ───────────────────────────────────────────────────────
  @Get('form-templates')
  async listFormTemplates() { return this.masterService.listFormTemplates(); }

  @Post('form-templates')
  @Roles(UserRole.ADMIN)
  async createFormTemplate(@Body() dto: any, @CurrentUser() u: any) {
    return this.masterService.createFormTemplate(dto, u.id);
  }

  // ─── Scoring Models ───────────────────────────────────────────────────────
  @Get('scoring-models')
  async listScoringModels() { return this.masterService.listScoringModels(); }

  @Post('scoring-models')
  @Roles(UserRole.ADMIN)
  async createScoringModel(@Body() dto: any, @CurrentUser() u: any) {
    return this.masterService.createScoringModel(dto, u.id);
  }

  // ─── Approval Matrix ──────────────────────────────────────────────────────
  @Get('approval-matrix')
  async listApprovalMatrix() { return this.masterService.listApprovalMatrix(); }

  @Put('approval-matrix/:id')
  @Roles(UserRole.ADMIN)
  async updateApprovalMatrix(@Param('id') id: string, @Body() dto: any, @CurrentUser() u: any) {
    return this.masterService.updateApprovalMatrix(id, dto, u.id);
  }

  // ─── Approval Criteria ────────────────────────────────────────────────────
  @Get('approval-criteria')
  async listApprovalCriteria() { return this.masterService.listApprovalCriteria(); }

  @Post('approval-criteria')
  @Roles(UserRole.ADMIN)
  async createApprovalCriteria(@Body() dto: any, @CurrentUser() u: any) {
    return this.masterService.createApprovalCriteria(dto, u.id);
  }

  // ─── Customers ────────────────────────────────────────────────────────────
  @Get('customers')
  @Roles(UserRole.ADMIN, UserRole.AUDIT, UserRole.CREDIT_OFFICER, UserRole.SENIOR_CREDIT_OFFICER,
    UserRole.CREDIT_SUPERVISOR, UserRole.CREDIT_MANAGER, UserRole.CREDIT_DIRECTOR, UserRole.VP_CREDIT)
  @ApiOperation({ summary: 'Search customers (data masked by role)' })
  async searchCustomers(@Query('q') q: string, @CurrentUser() u: any) {
    return this.masterService.searchCustomers(q, u.primaryRole);
  }

  // ─── Blacklist ────────────────────────────────────────────────────────────
  @Get('blacklist')
  @Roles(UserRole.ADMIN, UserRole.AUDIT)
  async listBlacklist() { return this.masterService.listBlacklist(); }

  @Post('blacklist')
  @Roles(UserRole.ADMIN)
  async addToBlacklist(@Body() dto: any, @CurrentUser() u: any) {
    return this.masterService.addToBlacklist(dto, u.id);
  }

  @Delete('blacklist/:id')
  @Roles(UserRole.ADMIN)
  async removeFromBlacklist(@Param('id') id: string, @CurrentUser() u: any) {
    return this.masterService.removeFromBlacklist(id, u.id);
  }
}
