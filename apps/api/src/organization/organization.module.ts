import { Module } from '@nestjs/common';
import { OrganizationService } from './organization.service';
import { OrganizationController } from './organization.controller';
import { TenancyModule } from '../tenancy/tenancy.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [TenancyModule, AuthModule],
  providers: [OrganizationService],
  controllers: [OrganizationController],
  exports: [OrganizationService],
})
export class OrganizationModule {}
