import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Tenant } from './entities/tenant.entity';
import { SuperAdmin } from './entities/super-admin.entity';
import { Plan } from './entities/plan.entity';
import { TenantMigrationLog } from './entities/tenant-migration-log.entity';
import { ControlService } from './control.service';
import { SuperAdminController } from './super-admin.controller';
import { TenancyModule } from '../tenancy/tenancy.module';
import { JwtModule } from '@nestjs/jwt';

@Module({
  imports: [
    TypeOrmModule.forFeature([Tenant, SuperAdmin, Plan, TenantMigrationLog]),
    forwardRef(() => TenancyModule),
    JwtModule.register({
      secret: process.env.JWT_ACCESS_SECRET || 'chat-task-jwt-access-secret-32-chars-long-secure',
    }),
  ],
  providers: [ControlService],
  controllers: [SuperAdminController],
  exports: [ControlService, TypeOrmModule],
})
export class ControlModule {}
