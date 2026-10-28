import { SetMetadata } from '@nestjs/common';
import { UserRole } from '@saas/shared';

export const Roles = (...roles: UserRole[]) => SetMetadata('roles', roles);
