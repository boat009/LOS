import {
  IsString, IsEmail, IsEnum, IsOptional, IsNumber, IsArray, IsUUID, IsPositive, MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UserRole } from '../../../common/enums';

export class CreateUserDto {
  @ApiProperty() @IsString() @MaxLength(100) username: string;
  @ApiProperty() @IsString() password: string;
  @ApiProperty() @IsString() @MaxLength(255) nameTh: string;
  @ApiPropertyOptional() @IsOptional() @IsString() nameEn: string;
  @ApiProperty() @IsEmail() email: string;
  @ApiPropertyOptional() @IsOptional() @IsString() phone: string;
  @ApiPropertyOptional() @IsOptional() @IsString() employeeId: string;
  @ApiPropertyOptional() @IsOptional() @IsString() department: string;
  @ApiProperty({ enum: UserRole }) @IsEnum(UserRole) primaryRole: UserRole;
  @ApiPropertyOptional() @IsOptional() @IsNumber() approvalLevel: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @IsPositive() maxApprovalAmount: number;
  @ApiPropertyOptional({ type: [String] }) @IsOptional() @IsArray() roleIds: string[];
  @ApiPropertyOptional({ type: [String] }) @IsOptional() @IsArray() adminIpWhitelist: string[];
}

export class UpdateUserDto {
  @ApiPropertyOptional() @IsOptional() @IsString() nameTh: string;
  @ApiPropertyOptional() @IsOptional() @IsString() nameEn: string;
  @ApiPropertyOptional() @IsOptional() @IsEmail() email: string;
  @ApiPropertyOptional() @IsOptional() @IsString() phone: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() approvalLevel: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @IsPositive() maxApprovalAmount: number;
  @ApiPropertyOptional() @IsOptional() isActive: boolean;
  @ApiPropertyOptional({ type: [String] }) @IsOptional() @IsArray() adminIpWhitelist: string[];
}

export class CreateDelegationDto {
  @ApiProperty() @IsUUID() delegatorId: string;
  @ApiProperty() @IsUUID() delegateId: string;
  @ApiProperty() @IsString() startDate: string;
  @ApiProperty() @IsString() endDate: string;
  @ApiPropertyOptional() @IsOptional() @IsString() reason: string;
}
