import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  UseGuards,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { ControlService } from './control.service';
import { TenantProvisioningService } from '../tenancy/tenant-provisioning.service';
import {
  CreateTenantDto,
  SuperAdminLoginRequestDto,
  SuperAdminLoginResponseDto,
  TenantStatus,
} from '@saas/shared';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';

@Controller('api/super-admin')
export class SuperAdminController {
  constructor(
    private readonly controlService: ControlService,
    private readonly provisioningService: TenantProvisioningService,
    private readonly jwtService: JwtService,
  ) {}

  @Post('login')
  async login(@Body() dto: SuperAdminLoginRequestDto): Promise<SuperAdminLoginResponseDto> {
    const admin = await this.controlService.findSuperAdminByEmail(dto.email.toLowerCase());
    if (!admin) {
      throw new UnauthorizedException('Invalid super-admin credentials');
    }

    const match = await bcrypt.compare(dto.password, admin.password_hash);
    if (!match) {
      throw new UnauthorizedException('Invalid super-admin credentials');
    }

    const token = this.jwtService.sign(
      {
        sub: admin.id,
        email: admin.email,
        name: admin.name,
        is_super_admin: true,
      },
      {
        secret: process.env.JWT_ACCESS_SECRET || 'chat-task-jwt-access-secret-32-chars-long-secure',
        expiresIn: '8h',
      },
    );

    return {
      access_token: token,
      admin: {
        id: admin.id,
        email: admin.email,
        name: admin.name,
      },
    };
  }

  @Get('tenants')
  async listTenants() {
    return this.controlService.getAllTenants();
  }

  @Post('tenants')
  async createTenant(@Body() dto: CreateTenantDto) {
    if (!dto.name || !dto.subdomain || !dto.admin_email || !dto.admin_password) {
      throw new BadRequestException('All fields (name, subdomain, admin_name, admin_email, admin_password) are required');
    }
    return this.provisioningService.provisionTenant(dto);
  }

  @Patch('tenants/:id/status')
  async updateTenantStatus(
    @Param('id') tenantId: string,
    @Body('status') status: TenantStatus,
  ) {
    await this.controlService.updateTenantStatus(tenantId, status);
    return { success: true, status };
  }

  @Get('migrations')
  async getMigrations() {
    return this.controlService.getMigrationLogs();
  }
}
