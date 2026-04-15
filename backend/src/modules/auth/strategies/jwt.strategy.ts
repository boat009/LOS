import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { InjectRedis } from '@nestjs-modules/ioredis';
import Redis from 'ioredis';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    config: ConfigService,
    @InjectRedis() private redis: Redis,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.get('jwt.privateKey') || 'los-jwt-secret-change-in-prod',
    });
  }

  async validate(payload: any) {
    // Check blacklist (for revoked tokens)
    if (payload.jti) {
      const isBlacklisted = await this.redis.get(`blacklist:${payload.jti}`);
      if (isBlacklisted) throw new UnauthorizedException('Token has been revoked');
    }

    return {
      id: payload.sub,
      username: payload.username,
      primaryRole: payload.primaryRole,
      approvalLevel: payload.approvalLevel,
      scope: payload.scope,
      jti: payload.jti,
    };
  }
}
