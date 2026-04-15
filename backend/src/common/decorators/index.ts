import {
  createParamDecorator, ExecutionContext, SetMetadata,
} from '@nestjs/common';

export const CurrentUser = createParamDecorator(
  (data: string, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user;
    return data ? user?.[data] : user;
  },
);

export const Roles = (...roles: string[]) => SetMetadata('roles', roles);
export const Permissions = (...permissions: string[]) => SetMetadata('permissions', permissions);
export const Public = () => SetMetadata('isPublic', true);
export const ApiKeyOnly = () => SetMetadata('apiKeyOnly', true);
export const RequireMfa = () => SetMetadata('requireMfa', true);
export const AuditLog = (action: string) => SetMetadata('auditAction', action);

export const ClientIp = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return request.headers['x-forwarded-for']?.split(',')[0].trim()
      || request.socket.remoteAddress;
  },
);
