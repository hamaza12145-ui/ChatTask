import {
  Controller,
  Get,
  Post,
  Put,
  Param,
  Body,
  UseGuards,
  Patch,
} from '@nestjs/common';
import { OrganizationService } from './organization.service';
import { JwtTenantGuard } from '../common/guards/jwt-tenant.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser, CurrentUserPayload } from '../common/decorators/current-user.decorator';
import {
  CreateDepartmentDto,
  CreateBranchDto,
  CreateDesignationDto,
  UserRole,
} from '@saas/shared';

@Controller('api/org')
@UseGuards(JwtTenantGuard, RolesGuard)
export class OrganizationController {
  constructor(private readonly orgService: OrganizationService) {}

  @Get('departments')
  async getDepartments() {
    return this.orgService.getDepartments();
  }

  @Post('departments')
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  async createDepartment(
    @Body() dto: CreateDepartmentDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.orgService.createDepartment(dto, user.id);
  }

  @Get('branches')
  async getBranches() {
    return this.orgService.getBranches();
  }

  @Post('branches')
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  async createBranch(
    @Body() dto: CreateBranchDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.orgService.createBranch(dto, user.id);
  }

  @Get('designations')
  async getDesignations() {
    return this.orgService.getDesignations();
  }

  @Post('designations')
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  async createDesignation(@Body() dto: CreateDesignationDto) {
    return this.orgService.createDesignation(dto);
  }

  @Get('users')
  async getUsers() {
    return this.orgService.getUsers();
  }

  @Patch('users/:id')
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  async updateUser(
    @Param('id') userId: string,
    @Body() body: { role?: UserRole; department_id?: string; branch_id?: string; designation_id?: string },
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.orgService.updateUser(userId, body, user.id);
  }

  @Patch('users/:id/deactivate')
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  async deactivateUser(
    @Param('id') userId: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    await this.orgService.deactivateUser(userId, user.id);
    return { success: true, message: 'User deactivated' };
  }

  @Get('audit-logs')
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  async getAuditLogs() {
    return this.orgService.getAuditLogs();
  }
}
