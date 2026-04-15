import { IsUUID, IsString, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateDelegationDto {
  @ApiProperty() @IsUUID() delegatorId: string;
  @ApiProperty() @IsUUID() delegateId: string;
  @ApiProperty() @IsString() startDate: string;
  @ApiProperty() @IsString() endDate: string;
  @ApiPropertyOptional() @IsOptional() @IsString() reason: string;
}
