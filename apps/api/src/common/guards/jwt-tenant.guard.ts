import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ClsService } from 'nestjs-cls';

@Injectable()
export class JwtTenantGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly cls: ClsService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Authorization header missing or invalid format');
    }

    const token = authHeader.substring(7);
    let payload: any;
    try {
      payload = this.jwtService.verify(token, {
        secret: process.env.JWT_ACCESS_SECRET || 'chat-task-jwt-access-secret-32-chars-long-secure',
      });
    } catch (err: any) {
      throw new UnauthorizedException('Token is invalid or expired: ' + err.message);
    }

    const currentTenantId = this.cls.get<string>('tenantId');

    // Super-admin check bypass
    if (payload.is_super_admin) {
      request.user = payload;
      return true;
    }

    // REQUIRED CHECK: Every request verifies JWT tenant matches the resolved subdomain; mismatch = 401
    if (!payload.tenant_id || payload.tenant_id !== currentTenantId) {
      throw new UnauthorizedException(
        `Cross-tenant access forbidden. JWT tenant (${payload.tenant_id}) does not match current tenant context (${currentTenantId}).`,
      );
    }

    request.user = payload;
    return true;
  }
}
