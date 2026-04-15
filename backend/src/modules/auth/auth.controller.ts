import {
  Controller, Post, Body, HttpCode, HttpStatus, Get, UseGuards, Req,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { MfaVerifyDto } from './dto/mfa-verify.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser, Public, ClientIp } from '../../common/decorators';

@ApiTags('Authentication')
@Controller('api/v1/auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @ApiOperation({ summary: 'Login — returns JWT or MFA challenge' })
  async login(@Body() dto: LoginDto, @ClientIp() ip: string, @Req() req: any) {
    return this.authService.login(dto, ip, req.headers['user-agent']);
  }

  @Public()
  @Post('mfa/verify')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @ApiOperation({ summary: 'Verify MFA OTP — exchanges partial token for full JWT' })
  async verifyMfa(@Body() dto: MfaVerifyDto, @ClientIp() ip: string) {
    return this.authService.verifyMfa(dto, dto.partialToken, ip);
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh access token using refresh token' })
  async refresh(@Body('refreshToken') refreshToken: string, @ClientIp() ip: string) {
    return this.authService.refreshToken(refreshToken, ip);
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Logout — revoke tokens' })
  async logout(@CurrentUser() user: any) {
    await this.authService.logout(user.id, user.jti);
    return { success: true };
  }

  @UseGuards(JwtAuthGuard)
  @Get('mfa/setup')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Generate TOTP QR code URI' })
  async setupTotp(@CurrentUser() user: any) {
    return this.authService.setupTotp(user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Post('mfa/enable')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Enable MFA after verifying first OTP' })
  async enableMfa(@CurrentUser() user: any, @Body('otp') otp: string) {
    return this.authService.enableMfa(user.id, otp);
  }
}
