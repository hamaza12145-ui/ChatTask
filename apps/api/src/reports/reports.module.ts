import { Module } from '@nestjs/common';
import { ReportsService } from './reports.service';
import { ReportsController } from './reports.controller';
import { TenancyModule } from '../tenancy/tenancy.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [TenancyModule, AuthModule],
  providers: [ReportsService],
  controllers: [ReportsController],
  exports: [ReportsService],
})
export class ReportsModule {}
