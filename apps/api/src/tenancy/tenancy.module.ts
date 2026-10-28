import { Module, forwardRef } from '@nestjs/common';
import { TenantConnectionService } from './tenant-connection.service';
import { TenantProvisioningService } from './tenant-provisioning.service';
import { TenantResolverMiddleware } from './tenant-resolver.middleware';
import { ControlModule } from '../control/control.module';

@Module({
  imports: [forwardRef(() => ControlModule)],
  providers: [TenantConnectionService, TenantProvisioningService, TenantResolverMiddleware],
  exports: [TenantConnectionService, TenantProvisioningService, TenantResolverMiddleware],
})
export class TenancyModule {}
