import * as dotenv from 'dotenv';
dotenv.config();

import { DataSource } from 'typeorm';
import { Tenant } from '../control/entities/tenant.entity';
import { SuperAdmin } from '../control/entities/super-admin.entity';
import { Plan } from '../control/entities/plan.entity';
import { TenantMigrationLog } from '../control/entities/tenant-migration-log.entity';
import { TENANT_ENTITIES } from '../tenant-entities';
import { CryptoUtil } from '../common/crypto.util';
import { TenantStatus } from '@saas/shared';

async function runTenantMigrations() {
  console.log('=== MULTI-TENANT MIGRATION RUNNER CLI ===');

  const controlHost = process.env.DB_HOST || '127.0.0.1';
  const controlPort = parseInt(process.env.DB_PORT || '5432', 10);
  const controlUser = process.env.DB_USER || 'postgres';
  const controlPassword = process.env.DB_PASSWORD || '';
  const controlDbName = process.env.DB_CONTROL_NAME || 'tenant_control';
  const secretKey = process.env.DB_ENCRYPTION_KEY || 'supersecret32characterkeyforaes!';

  // Connect to Control DB
  const controlDataSource = new DataSource({
    type: 'postgres',
    host: controlHost,
    port: controlPort,
    username: controlUser,
    password: controlPassword,
    database: controlDbName,
    entities: [Tenant, SuperAdmin, Plan, TenantMigrationLog],
    synchronize: true,
  });

  await controlDataSource.initialize();
  console.log('Connected to Control DB successfully.');

  const tenantRepo = controlDataSource.getRepository(Tenant);
  const logRepo = controlDataSource.getRepository(TenantMigrationLog);

  const activeTenants = await tenantRepo.find({
    where: { status: TenantStatus.ACTIVE },
  });

  console.log(`Found ${activeTenants.length} active tenant(s) to migrate.`);

  let successCount = 0;
  let failureCount = 0;
  const failures: Array<{ subdomain: string; error: string }> = [];

  for (const tenant of activeTenants) {
    console.log(`\n--> Migrating tenant [${tenant.subdomain}] (${tenant.db_name})...`);
    const password = CryptoUtil.decrypt(tenant.db_password_encrypted, secretKey);

    const tenantDataSource = new DataSource({
      type: 'postgres',
      host: tenant.db_host,
      port: tenant.db_port || 5432,
      username: tenant.db_user,
      password: password,
      database: tenant.db_name,
      entities: TENANT_ENTITIES,
      synchronize: true, // Syncs all tables safely
      logging: false,
    });

    try {
      await tenantDataSource.initialize();

      // Record migration success
      const currentVersion = tenant.schema_version + 1;
      await tenantRepo.update(tenant.id, { schema_version: currentVersion });

      await logRepo.save(
        logRepo.create({
          tenant_id: tenant.id,
          migration_name: `SCHEMA_SYNC_V${currentVersion}`,
          status: 'SUCCESS',
        }),
      );

      console.log(`✓ Tenant [${tenant.subdomain}] successfully migrated to schema version ${currentVersion}.`);
      successCount++;
    } catch (err: any) {
      console.error(`✗ Error migrating tenant [${tenant.subdomain}]: ${err.message}`);
      failureCount++;
      failures.push({ subdomain: tenant.subdomain, error: err.message });

      // Log failure but CONTINUE past failures as required by spec!
      await logRepo.save(
        logRepo.create({
          tenant_id: tenant.id,
          migration_name: `SCHEMA_SYNC_V${tenant.schema_version + 1}`,
          status: 'FAILED',
          error: err.message,
        }),
      );
    } finally {
      if (tenantDataSource.isInitialized) {
        await tenantDataSource.destroy();
      }
    }
  }

  await controlDataSource.destroy();

  console.log('\n=== MIGRATION SUMMARY ===');
  console.log(`Total active tenants: ${activeTenants.length}`);
  console.log(`Successful: ${successCount}`);
  console.log(`Failed: ${failureCount}`);

  if (failures.length > 0) {
    console.log('\nFailures report:');
    failures.forEach((f) => console.log(` - ${f.subdomain}: ${f.error}`));
  }

  console.log('=========================\n');
}

runTenantMigrations().catch((err) => {
  console.error('Fatal migration CLI error:', err);
  process.exit(1);
});
