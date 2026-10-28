import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ClsModule } from 'nestjs-cls';
import { ConfigModule } from '@nestjs/config';

import { Tenant } from './control/entities/tenant.entity';
import { SuperAdmin } from './control/entities/super-admin.entity';
import { Plan } from './control/entities/plan.entity';
import { TenantMigrationLog } from './control/entities/tenant-migration-log.entity';

import { ControlModule } from './control/control.module';
import { TenancyModule } from './tenancy/tenancy.module';
import { TenantResolverMiddleware } from './tenancy/tenant-resolver.middleware';
import { AuthModule } from './auth/auth.module';
import { OrganizationModule } from './organization/organization.module';
import { ChatModule } from './chat/chat.module';
import { RealtimeModule } from './realtime/realtime.module';
import { TasksModule } from './tasks/tasks.module';
import { StorageModule } from './storage/storage.module';
import { NotificationsModule } from './notifications/notifications.module';
import { ReportsModule } from './reports/reports.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '../../.env'],
    }),
    ClsModule.forRoot({
      global: true,
      middleware: { mount: true },
    }),
    // ONLY Control DB is configured statically from environment variables as required by spec!
    TypeOrmModule.forRootAsync({
      useFactory: () => ({
        type: 'postgres',
        host: process.env.DB_HOST || '127.0.0.1',
        port: parseInt(process.env.DB_PORT || '5432', 10),
        username: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_CONTROL_NAME || 'taskcom',
        entities: [Tenant, SuperAdmin, Plan, TenantMigrationLog],
        synchronize: true, // Control schema auto-sync
        logging: false,
      }),
    }),
    ControlModule,
    TenancyModule,
    AuthModule,
    OrganizationModule,
    ChatModule,
    RealtimeModule,
    TasksModule,
    StorageModule,
    NotificationsModule,
    ReportsModule,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(TenantResolverMiddleware)
      .forRoutes('*');
  }
}
