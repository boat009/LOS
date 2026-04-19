import {
  Controller, Post, Get, Body, Param, Headers, UnauthorizedException,
  UseGuards, Req, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiSecurity } from '@nestjs/swagger';
import { IntegrationService } from './integration.service';
import { CreateApplicationDto } from './dto/create-application.dto';
import { Public, CurrentUser, ClientIp } from '../../common/decorators';
import { ConfigService } from '@nestjs/config';
import { verifyHmac } from '../../common/utils/crypto.util';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@ApiTags('Integration - Sale System')
@Controller('api/v1/integration')
export class IntegrationController {
  constructor(
    private readonly integrationService: IntegrationService,
    private readonly config: ConfigService,
  ) {}

  @Public()
  @Post('applications')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Receive loan application from Sale System (API Key + HMAC)' })
  @ApiSecurity('ApiKey')
  async createApplication(
    @Body() dto: CreateApplicationDto,
    @Headers('x-api-key') apiKey: string,
    @Headers('x-hmac-signature') hmacSig: string,
    @Headers('x-timestamp') timestamp: string,
    @Req() req: any,
    @ClientIp() ip: string,
  ) {
    this.verifyApiKeyAndHmac(apiKey, hmacSig, timestamp, JSON.stringify(dto));

    const saleUserId = req.headers['x-sale-user-id'] || 'system';
    return this.integrationService.createApplication(dto, saleUserId, ip);
  }

  /**
   * Internal endpoint — called by the LOS frontend (JWT auth).
   * Allows Sale staff to create an application without needing API Key + HMAC.
   */
  @UseGuards(JwtAuthGuard)
  @Post('applications/internal')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create application from internal LOS UI (JWT)' })
  async createApplicationInternal(
    @Body() dto: CreateApplicationDto,
    @CurrentUser() user: any,
    @ClientIp() ip: string,
  ) {
    return this.integrationService.createApplication(dto, user.id, ip);
  }

  @UseGuards(JwtAuthGuard)
  @Get('applications/:id/status')
  @ApiOperation({ summary: 'Get application status (for Sale System)' })
  async getStatus(@Param('id') id: string, @CurrentUser() user: any) {
    return this.integrationService.getApplicationStatus(id, user.id);
  }

  private verifyApiKeyAndHmac(apiKey: string, hmacSig: string, timestamp: string, body: string) {
    const expectedApiKey = this.config.get('saleSystem.apiKey') || 'sale-api-key';
    if (!apiKey || apiKey !== expectedApiKey) {
      throw new UnauthorizedException('Invalid API key');
    }

    // Verify HMAC
    if (hmacSig) {
      const secret = this.config.get('saleSystem.hmacSecret');
      const payload = `${timestamp}.${body}`;
      if (!verifyHmac(payload, hmacSig, secret)) {
        throw new UnauthorizedException('Invalid HMAC signature');
      }

      // Replay attack prevention: timestamp must be within 5 minutes
      const ts = parseInt(timestamp, 10);
      const now = Math.floor(Date.now() / 1000);
      if (Math.abs(now - ts) > 300) {
        throw new UnauthorizedException('Request timestamp expired');
      }
    }
  }
}
