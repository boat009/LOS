import { IsString, IsEmail, IsOptional, IsNumber, IsArray, IsPositive, IsBoolean } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateUserDto {
  @ApiPropertyOptional() @IsOptional() @IsString() nameTh?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() nameEn?: string;
  @ApiPropertyOptional() @IsOptional() @IsEmail() email?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() phone?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() approvalLevel?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @IsPositive() maxApprovalAmount?: number;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isActive?: boolean;
  @ApiPropertyOptional({ type: [String] }) @IsOptional() @IsArray() adminIpWhitelist?: string[];
}
