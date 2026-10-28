import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { Client } from 'pg';
import * as bcrypt from 'bcryptjs';
import { ControlService } from '../control/control.service';
import { TenantConnectionService } from './tenant-connection.service';
import { CryptoUtil } from '../common/crypto.util';
import {
  TenantStatus,
  UserRole,
  UserStatus,
  TaskStatusCategory,
  ConversationType,
  CreateTenantDto,
} from '@saas/shared';
import {
  User,
  Role,
  TaskStatus,
  Conversation,
  ConversationMember,
  Department,
  Branch,
  Designation,
} from '../tenant-entities';

@Injectable()
export class TenantProvisioningService {
  private readonly logger = new Logger(TenantProvisioningService.name);

  constructor(
    private readonly controlService: ControlService,
    private readonly tenantConnectionService: TenantConnectionService,
  ) {}

  async provisionTenant(dto: CreateTenantDto): Promise<{ tenantId: string; subdomain: string }> {
    const subdomain = dto.subdomain.trim().toLowerCase();
    
    // Validate subdomain format (alphanumeric and dashes only)
    if (!/^[a-z0-9-]+$/.test(subdomain)) {
      throw new BadRequestException('Subdomain must be alphanumeric with optional dashes');
    }

    const existing = await this.controlService.findTenantBySubdomain(subdomain);
    if (existing) {
      throw new BadRequestException(`Subdomain '${subdomain}' is already taken`);
    }

    const dbName = `tenant_${subdomain.replace(/-/g, '_')}`;
    const dbHost = process.env.DB_HOST || '127.0.0.1';
    const dbPort = parseInt(process.env.DB_PORT || '5432', 10);
    const dbUser = process.env.DB_USER || 'postgres';
    const dbPassword = process.env.DB_PASSWORD || '';
    const secretKey = process.env.DB_ENCRYPTION_KEY || 'supersecret32characterkeyforaes!';

    const dbPasswordEncrypted = CryptoUtil.encrypt(dbPassword, secretKey);

    // 1. Create Tenant Record in Control DB with PROVISIONING status
    const tenant = await this.controlService.saveTenant({
      name: dto.name,
      subdomain: subdomain,
      db_name: dbName,
      db_host: dbHost,
      db_port: dbPort,
      db_user: dbUser,
      db_password_encrypted: dbPasswordEncrypted,
      plan: dto.plan_id || 'free',
      status: TenantStatus.PROVISIONING,
      schema_version: 1,
    });

    try {
      // 2. Create PostgreSQL Database for Tenant
      await this.createPostgresDatabase(dbHost, dbPort, dbUser, dbPassword, dbName);

      // 3. Connect to Tenant DB and Initialize Schema & Seed Data
      const tenantDataSource = await this.tenantConnectionService.getDataSource(tenant.id, {
        db_name: dbName,
        db_host: dbHost,
        db_port: dbPort,
        db_user: dbUser,
        db_password_encrypted: dbPasswordEncrypted,
      });

      // 4. Seed Default Tenant Data (Roles, Statuses, Admin, Channels)
      await this.seedTenantDefaults(tenantDataSource, dto);

      // 5. Update Status to ACTIVE
      await this.controlService.updateTenantStatus(tenant.id, TenantStatus.ACTIVE);
      this.logger.log(`Tenant '${subdomain}' successfully provisioned and activated.`);

      return {
        tenantId: tenant.id,
        subdomain: tenant.subdomain,
      };
    } catch (err: any) {
      this.logger.error(`Tenant provisioning failed for '${subdomain}': ${err.message}`, err.stack);
      await this.controlService.updateTenantStatus(tenant.id, TenantStatus.DELETED);
      throw err;
    }
  }

  private async createPostgresDatabase(
    host: string,
    port: number,
    user: string,
    password: string,
    dbName: string,
  ): Promise<void> {
    const client = new Client({
      host,
      port,
      user,
      password,
      database: 'postgres', // Connect to default postgres DB to issue CREATE DATABASE
    });

    await client.connect();
    try {
      // Check if DB already exists
      const checkRes = await client.query(
        `SELECT 1 FROM pg_database WHERE datname = $1`,
        [dbName],
      );

      if (checkRes.rowCount === 0) {
        this.logger.log(`Creating database ${dbName}...`);
        await client.query(`CREATE DATABASE "${dbName}"`);
      }
    } finally {
      await client.end();
    }
  }

  private async seedTenantDefaults(dataSource: DataSource, dto: CreateTenantDto): Promise<void> {
    const roleRepo = dataSource.getRepository(Role);
    const statusRepo = dataSource.getRepository(TaskStatus);
    const userRepo = dataSource.getRepository(User);
    const convRepo = dataSource.getRepository(Conversation);
    const memberRepo = dataSource.getRepository(ConversationMember);
    const deptRepo = dataSource.getRepository(Department);
    const branchRepo = dataSource.getRepository(Branch);
    const desigRepo = dataSource.getRepository(Designation);

    // 1. Seed Roles
    const defaultRoles = [
      {
        name: UserRole.OWNER,
        is_system: true,
        permissions: ['*'],
        description: 'Organization Owner with unrestricted administrative rights',
      },
      {
        name: UserRole.ADMIN,
        is_system: true,
        permissions: ['users:*', 'tasks:*', 'chat:*', 'departments:*', 'reports:*', 'settings:*'],
        description: 'Tenant Administrator',
      },
      {
        name: UserRole.MANAGER,
        is_system: true,
        permissions: ['tasks:create', 'tasks:edit_all', 'tasks:approve', 'chat:*', 'reports:department'],
        description: 'Department Manager',
      },
      {
        name: UserRole.MEMBER,
        is_system: true,
        permissions: ['tasks:create', 'tasks:edit_assigned', 'chat:*'],
        description: 'Standard Team Member',
      },
    ];

    for (const r of defaultRoles) {
      const exists = await roleRepo.findOne({ where: { name: r.name } });
      if (!exists) {
        await roleRepo.save(roleRepo.create(r));
      }
    }

    // 2. Seed Default Task Statuses
    const defaultStatuses = [
      { name: 'To Do', category: TaskStatusCategory.TODO, color: '#64748b', order: 0, is_closed: false, requires_approval: false },
      { name: 'In Progress', category: TaskStatusCategory.IN_PROGRESS, color: '#3b82f6', order: 1, is_closed: false, requires_approval: false },
      { name: 'On Hold', category: TaskStatusCategory.ON_HOLD, color: '#f59e0b', order: 2, is_closed: false, requires_approval: false },
      { name: 'Under Review', category: TaskStatusCategory.UNDER_REVIEW, color: '#8b5cf6', order: 3, is_closed: false, requires_approval: true },
      { name: 'Done', category: TaskStatusCategory.DONE, color: '#10b981', order: 4, is_closed: true, requires_approval: false },
      { name: 'Cancelled', category: TaskStatusCategory.CANCELLED, color: '#ef4444', order: 5, is_closed: true, requires_approval: false },
      { name: 'Reopened', category: TaskStatusCategory.REOPENED, color: '#ec4899', order: 6, is_closed: false, requires_approval: false },
    ];

    for (const s of defaultStatuses) {
      const exists = await statusRepo.findOne({ where: { name: s.name } });
      if (!exists) {
        await statusRepo.save(statusRepo.create(s));
      }
    }

    // 3. Seed Default Department & Branch
    let defaultDept = await deptRepo.findOne({ where: { name: 'General' } });
    if (!defaultDept) {
      defaultDept = await deptRepo.save(deptRepo.create({ name: 'General' }));
    }

    let defaultBranch = await branchRepo.findOne({ where: { name: 'Headquarters' } });
    if (!defaultBranch) {
      defaultBranch = await branchRepo.save(branchRepo.create({ name: 'Headquarters', location: 'Main Campus' }));
    }

    let defaultDesig = await desigRepo.findOne({ where: { title: 'Executive' } });
    if (!defaultDesig) {
      defaultDesig = await desigRepo.save(desigRepo.create({ title: 'Executive' }));
    }

    // 4. Seed First Admin User
    const passwordHash = await bcrypt.hash(dto.admin_password, 10);
    let adminUser = await userRepo.findOne({ where: { email: dto.admin_email.toLowerCase() } });
    if (!adminUser) {
      adminUser = await userRepo.save(
        userRepo.create({
          name: dto.admin_name,
          email: dto.admin_email.toLowerCase(),
          password_hash: passwordHash,
          role: UserRole.OWNER,
          status: UserStatus.ACTIVE,
          department_id: defaultDept.id,
          branch_id: defaultBranch.id,
          designation_id: defaultDesig.id,
        }),
      );
    }

    // 5. Seed General Organization Announcement Channel
    let generalChannel = await convRepo.findOne({ where: { title: 'General Announcements' } });
    if (!generalChannel) {
      generalChannel = await convRepo.save(
        convRepo.create({
          type: ConversationType.GROUP,
          title: 'General Announcements',
          description: 'Official organization channel for all team members',
          created_by: adminUser.id,
          is_readonly: false,
        }),
      );

      await memberRepo.save(
        memberRepo.create({
          conversation_id: generalChannel.id,
          user_id: adminUser.id,
          is_admin: true,
        }),
      );
    }
  }
}
