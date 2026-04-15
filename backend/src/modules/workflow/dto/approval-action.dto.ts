import { IsEnum, IsString, IsOptional, IsNumber, IsPositive } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ApprovalAction } from '../../../common/enums';

export class ApprovalActionDto {
  @ApiProperty({ enum: ApprovalAction })
  @IsEnum(ApprovalAction)
  action: ApprovalAction;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  reason: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  comment: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @IsPositive()
  approvedAmount: number;
}
