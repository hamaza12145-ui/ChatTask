import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Tenant } from './entities/tenant.entity';
import { SuperAdmin } from './entities/super-admin.entity';
import { Plan } from './entities/plan.entity';
import { TenantMigrationLog } from './entities/tenant-migration-log.entity';
import { TenantStatus } from '@saas/shared';

@Injectable()
export class ControlService {
  private readonly logger = new Logger(ControlService.name);
  private tenantCacheBySubdomain = new Map<string, { tenant: Tenant; cachedAt: number }>();
  private readonly CACHE_TTL_MS = 60 * 1000; // 1 minute in-memory cache

  constructor(
    @InjectRepository(Tenant)
    private readonly tenantRepo: Repository<Tenant>,
    @InjectRepository(SuperAdmin)
    private readonly superAdminRepo: Repository<SuperAdmin>,
    @InjectRepository(Plan)
    private readonly planRepo: Repository<Plan>,
    @InjectRepository(TenantMigrationLog)
    private readonly migrationLogRepo: Repository<TenantMigrationLog>,
  ) {}

  async findTenantBySubdomain(subdomain: string): Promise<Tenant | null> {
    const cached = this.tenantCacheBySubdomain.get(subdomain);
    if (cached && Date.now() - cached.cachedAt < this.CACHE_TTL_MS) {
      return cached.tenant;
    }

    const tenant = await this.tenantRepo.findOne({
      where: { subdomain },
    });

    if (tenant) {
      this.tenantCacheBySubdomain.set(subdomain, { tenant, cachedAt: Date.now() });
    }

    return tenant;
  }

  async findTenantById(id: string): Promise<Tenant | null> {
    return this.tenantRepo.findOne({ where: { id } });
  }

  async getAllActiveTenants(): Promise<Tenant[]> {
    return this.tenantRepo.find({
      where: { status: TenantStatus.ACTIVE },
    });
  }

  async getAllTenants(): Promise<Tenant[]> {
    return this.tenantRepo.find({
      order: { created_at: 'DESC' },
    });
  }

  async updateTenantStatus(id: string, status: TenantStatus): Promise<void> {
    await this.tenantRepo.update(id, { status });
    // Invalidate cache
    const tenant = await this.tenantRepo.findOne({ where: { id } });
    if (tenant) {
      this.tenantCacheBySubdomain.delete(tenant.subdomain);
    }
  }

  async updateTenantStorage(id: string, bytesDelta: number): Promise<void> {
    await this.tenantRepo
      .createQueryBuilder()
      .update(Tenant)
      .set({
        storage_used_bytes: () => `storage_used_bytes + ${bytesDelta}`,
      })
      .where('id = :id', { id })
      .execute();
  }

  async logMigration(tenantId: string, migrationName: string, status: string, error?: string): Promise<void> {
    const log = this.migrationLogRepo.create({
      tenant_id: tenantId,
      migration_name: migrationName,
      status,
      error,
    });
    await this.migrationLogRepo.save(log);
  }

  async getMigrationLogs(tenantId?: string): Promise<TenantMigrationLog[]> {
    if (tenantId) {
      return this.migrationLogRepo.find({
        where: { tenant_id: tenantId },
        order: { applied_at: 'DESC' },
      });
    }
    return this.migrationLogRepo.find({ order: { applied_at: 'DESC' } });
  }

  async findSuperAdminByEmail(email: string): Promise<SuperAdmin | null> {
    return this.superAdminRepo.findOne({ where: { email } });
  }

  async createSuperAdmin(data: Partial<SuperAdmin>): Promise<SuperAdmin> {
    const admin = this.superAdminRepo.create(data);
    return this.superAdminRepo.save(admin);
  }

  async getPlan(planId: string): Promise<Plan | null> {
    return this.planRepo.findOne({ where: { id: planId } });
  }

  async saveTenant(tenant: Partial<Tenant>): Promise<Tenant> {
    const entity = this.tenantRepo.create(tenant);
    const saved = await this.tenantRepo.save(entity);
    this.tenantCacheBySubdomain.delete(saved.subdomain);
    return saved;
  }
}
