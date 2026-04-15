import { Injectable, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Reflector } from '@nestjs/core';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private reflector: Reflector) {
    super();
  }

  canActivate(context: ExecutionContext) {
    const isPublic = this.reflector.getAllAndOverride<boolean>('isPublic', [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const isApiKeyOnly = this.reflector.getAllAndOverride<boolean>('apiKeyOnly', [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isApiKeyOnly) return true;

    return super.canActivate(context);
  }

  handleRequest(err: any, user: any, info: any) {
    if (err || !user) {
      throw err || new UnauthorizedException('Invalid or expired token');
    }
    // Reject MFA-pending tokens for full access endpoints
    if (user.scope === 'mfa_pending') {
      throw new UnauthorizedException('MFA verification required');
    }
    return user;
  }
}
