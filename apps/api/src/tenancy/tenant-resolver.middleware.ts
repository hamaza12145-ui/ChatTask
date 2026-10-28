import { Injectable, NestMiddleware, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { ClsService } from 'nestjs-cls';
import { ControlService } from '../control/control.service';
import { TenantStatus } from '@saas/shared';

@Injectable()
export class TenantResolverMiddleware implements NestMiddleware {
  constructor(
    private readonly cls: ClsService,
    private readonly controlService: ControlService,
  ) {}

  async use(req: Request, res: Response, next: NextFunction) {
    const path = req.path;

    // Allow super-admin control plane, docs, health, and uploads without tenant resolution
    if (
      path.startsWith('/api/super-admin') ||
      path.startsWith('/docs') ||
      path === '/api/health' ||
      path.startsWith('/uploads')
    ) {
      return next();
    }

    let subdomain: string | null = null;

    // 1. Check for single-tenant mode
    const isSingleTenant = process.env.SINGLE_TENANT === 'true';
    if (isSingleTenant) {
      subdomain = process.env.DEFAULT_TENANT_SUBDOMAIN || 'acme';
    } else {
      // 2. Extract from X-Tenant header (dev/testing)
      const headerTenant = req.headers['x-tenant'] as string;
      if (headerTenant) {
        subdomain = headerTenant.trim().toLowerCase();
      } else {
        // 3. Extract from Host header
        const host = req.headers.host || '';
        const parts = host.split(':')[0].split('.');
        if (parts.length > 1 && parts[0] !== 'localhost' && parts[0] !== 'www') {
          subdomain = parts[0].toLowerCase();
        }
      }
    }

    if (!subdomain) {
      subdomain = process.env.DEFAULT_TENANT_SUBDOMAIN || 'taskcom';
    }

    let tenant = await this.controlService.findTenantBySubdomain(subdomain);

    // If 'taskcom' was requested or defaulted, try 'acme' as alternative default if not found
    if (!tenant && (subdomain === 'taskcom' || subdomain === 'acme')) {
      const fallbackSub = subdomain === 'taskcom' ? 'acme' : 'taskcom';
      tenant = await this.controlService.findTenantBySubdomain(fallbackSub);
    }

    if (!tenant) {
      throw new NotFoundException(`Tenant '${subdomain}' not found`);
    }

    if (tenant.status === TenantStatus.SUSPENDED) {
      throw new UnauthorizedException(`Tenant '${subdomain}' is suspended. Please contact support.`);
    }

    if (tenant.status === TenantStatus.DELETED) {
      throw new NotFoundException(`Tenant '${subdomain}' does not exist.`);
    }

    // Wrap execution inside ClsService.run to guarantee active AsyncLocalStorage context
    return this.cls.run(async () => {
      this.cls.set('tenantId', tenant.id);
      this.cls.set('tenantSubdomain', tenant.subdomain);
      this.cls.set('tenant', tenant);
      this.cls.set('tenantConfig', {
        db_name: tenant.db_name,
        db_host: tenant.db_host,
        db_port: tenant.db_port,
        db_user: tenant.db_user,
        db_password_encrypted: tenant.db_password_encrypted,
      });

      next();
    });
  }
}
