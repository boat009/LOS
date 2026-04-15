import {
  IsString, IsNumber, IsOptional, IsPositive, MaxLength,
  IsDateString, IsBoolean, IsUUID,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateApplicationDto {
  @ApiProperty({ description: 'Thai National ID (13 digits)', example: '1234567890121' })
  @IsString()
  nationalId: string;

  @ApiProperty({ description: 'Customer full name (Thai)', example: 'นายสมชาย ใจดี' })
  @IsString()
  @MaxLength(255)
  nameTh: string;

  @ApiPropertyOptional({ description: 'Customer full name (English)' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  nameEn: string;

  @ApiPropertyOptional({ example: '1990-01-15' })
  @IsOptional()
  @IsDateString()
  dateOfBirth: string;

  @ApiPropertyOptional({ example: '2030-12-31' })
  @IsOptional()
  @IsDateString()
  idExpiryDate: string;

  @ApiPropertyOptional({ example: '0812345678' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  phone: string;

  @ApiPropertyOptional({ example: 'customer@email.com' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  email: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  address: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  province: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  employmentType: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  employerName: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  employmentDurationMonths: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @IsPositive()
  monthlyIncome: number;

  @ApiProperty({ description: 'Product UUID' })
  @IsUUID()
  productId: string;

  @ApiProperty({ description: 'Requested loan amount (THB)', example: 100000 })
  @IsNumber()
  @IsPositive()
  requestedAmount: number;

  @ApiPropertyOptional({ description: 'Reference ID from Sale System' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  saleSystemRef: string;

  @ApiPropertyOptional({ description: 'Callback URL for result notification' })
  @IsOptional()
  @IsString()
  callbackUrl: string;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  pdpaConsent: boolean;
}
