import {
  Controller, Get, Post, Put, Delete, Body, Param,
  UseGuards, Query, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { CreateUserDto, UpdateUserDto, CreateDelegationDto } from './dto/create-user.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CurrentUser, Roles } from '../../common/decorators';
import { UserRole } from '../../common/enums';

@ApiTags('Users Management')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('api/v1/users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'List all users (paginated)' })
  async findAll(@Query('page') page = 1, @Query('limit') limit = 20) {
    return this.usersService.findAll(+page, +limit);
  }

  @Get(':id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Get user by ID' })
  async findOne(@Param('id') id: string) {
    return this.usersService.findOne(id);
  }

  @Post()
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Create user' })
  async create(@Body() dto: CreateUserDto, @CurrentUser() actor: any) {
    return this.usersService.create(dto, actor.id);
  }

  @Put(':id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Update user' })
  async update(@Param('id') id: string, @Body() dto: UpdateUserDto, @CurrentUser() actor: any) {
    return this.usersService.update(id, dto, actor.id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Soft delete user' })
  async delete(@Param('id') id: string, @CurrentUser() actor: any) {
    return this.usersService.softDelete(id, actor.id);
  }

  @Post(':id/change-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Change own password' })
  async changePassword(
    @Param('id') id: string,
    @Body('currentPassword') current: string,
    @Body('newPassword') newPass: string,
    @CurrentUser() actor: any,
  ) {
    return this.usersService.changePassword(id, current, newPass, actor.id);
  }

  @Post('delegations')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Create delegation of authority' })
  async createDelegation(@Body() dto: CreateDelegationDto, @CurrentUser() actor: any) {
    return this.usersService.createDelegation(dto, actor.id);
  }

  @Get('delegations/active')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Get active delegations' })
  async getActiveDelegations() {
    return this.usersService.getActiveDelegations();
  }
}
