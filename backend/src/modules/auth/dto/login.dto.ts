import { IsString, MinLength, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({ example: 'john.doe' })
  @IsString()
  @MaxLength(100)
  username: string;

  @ApiProperty({ example: 'SecureP@ss1' })
  @IsString()
  @MinLength(8)
  @MaxLength(128)
  password: string;
}

export class MfaVerifyDto {
  @ApiProperty({ example: '123456' })
  @IsString()
  @MinLength(6)
  @MaxLength(8)
  otp: string;
}

export class RefreshTokenDto {
  @ApiProperty()
  @IsString()
  refreshToken: string;
}
