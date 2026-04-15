import { IsString, MinLength, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class MfaVerifyDto {
  @ApiProperty({ example: '123456' })
  @IsString()
  @MinLength(6)
  @MaxLength(8)
  otp: string;

  @ApiProperty()
  @IsString()
  partialToken: string;
}
