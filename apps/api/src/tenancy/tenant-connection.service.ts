import { Injectable, OnModuleDestroy, Logger, NotFoundException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { ClsService } from 'nestjs-cls';
import { TENANT_ENTITIES } from '../tenant-entities';
import { CryptoUtil } from '../common/crypto.util';

interface CachedConnection {
  dataSource: DataSource;
  lastUsed: number;
}

@Injectable()
export class TenantConnectionService implements OnModuleDestroy {
  private readonly logger = new Logger(TenantConnectionService.name);
  private connectionCache = new Map<string, CachedConnection>();
  private idleCheckInterval: NodeJS.Timeout;
  private readonly IDLE_TIMEOUT_MS = 15 * 60 * 1000; // 15 minutes idle close

  constructor(private readonly cls: ClsService) {
    // Schedule background sweep for idle tenant DataSources
    this.idleCheckInterval = setInterval(() => {
      this.closeIdleConnections();
    }, 60 * 1000); // Check every minute
  }

  async getDataSourceForCurrentRequest(): Promise<DataSource> {
    const tenantId = this.cls.get<string>('tenantId');
    if (!tenantId) {
      throw new NotFoundException('Tenant context not found for current request');
    }
    return this.getDataSource(tenantId);
  }

  async getDataSource(tenantId: string, tenantConfig?: {
    db_name: string;
    db_host: string;
    db_port: number;
    db_user: string;
    db_password_encrypted: string;
  }): Promise<DataSource> {
    const cached = this.connectionCache.get(tenantId);
    if (cached && cached.dataSource.isInitialized) {
      cached.lastUsed = Date.now();
      return cached.dataSource;
    }

    // If not cached, we need connection details
    let config = tenantConfig;
    if (!config) {
      config = this.cls.get('tenantConfig');
    }

    if (!config) {
      throw new NotFoundException(`Tenant configuration for ${tenantId} not found in context`);
    }

    const secretKey = process.env.DB_ENCRYPTION_KEY || 'supersecret32characterkeyforaes!';
    const password = CryptoUtil.decrypt(config.db_password_encrypted, secretKey);

    this.logger.log(`Initializing lazy DataSource for tenant: ${tenantId} on DB: ${config.db_name}`);

    const dataSource = new DataSource({
      type: 'postgres',
      host: config.db_host,
      port: config.db_port || 5432,
      username: config.db_user,
      password: password,
      database: config.db_name,
      entities: TENANT_ENTITIES,
      synchronize: true, // Will ensure tables match schema
      logging: false,
      extra: {
        max: 3, // Small pool as required by spec (max 3 connections per tenant)
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 5000,
      },
    });

    await dataSource.initialize();

    this.connectionCache.set(tenantId, {
      dataSource,
      lastUsed: Date.now(),
    });

    return dataSource;
  }

  private async closeIdleConnections() {
    const now = Date.now();
    for (const [tenantId, item] of this.connectionCache.entries()) {
      if (now - item.lastUsed > this.IDLE_TIMEOUT_MS) {
        this.logger.log(`Closing idle DataSource for tenant: ${tenantId}`);
        try {
          if (item.dataSource.isInitialized) {
            await item.dataSource.destroy();
          }
        } catch (err) {
          this.logger.error(`Error closing idle connection for ${tenantId}`, err);
        } finally {
          this.connectionCache.delete(tenantId);
        }
      }
    }
  }

  async onModuleDestroy() {
    clearInterval(this.idleCheckInterval);
    for (const [tenantId, item] of this.connectionCache.entries()) {
      try {
        if (item.dataSource.isInitialized) {
          await item.dataSource.destroy();
        }
      } catch (err) {
        this.logger.error(`Error destroying connection for tenant ${tenantId}`, err);
      }
    }
    this.connectionCache.clear();
  }
}
