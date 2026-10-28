import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';

import { ENTITIES } from './entities';

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
    TypeOrmModule.forRootAsync({
      useFactory: () => ({
        type: 'postgres',
        host: process.env.DB_HOST || '127.0.0.1',
        port: parseInt(process.env.DB_PORT || '5432', 10),
        username: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD || 'root',
        database: process.env.DB_NAME || 'taskcom',
        entities: ENTITIES,
        synchronize: true,
        logging: false,
      }),
    }),
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
export class AppModule {}
