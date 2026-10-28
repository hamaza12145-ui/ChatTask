import { Injectable, UnauthorizedException, BadRequestException, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ClsService } from 'nestjs-cls';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
import { TenantConnectionService } from '../tenancy/tenant-connection.service';
import { User, RefreshToken, Invitation } from '../tenant-entities';
import {
  LoginRequestDto,
  LoginResponseDto,
  InviteUserDto,
  UserStatus,
  UserRole,
} from '@saas/shared';
import { Tenant } from '../control/entities/tenant.entity';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly cls: ClsService,
    private readonly tenantConnectionService: TenantConnectionService,
  ) {}

  async login(dto: LoginRequestDto): Promise<LoginResponseDto> {
    const dataSource = await this.tenantConnectionService.getDataSourceForCurrentRequest();
    const userRepo = dataSource.getRepository(User);
    const tenant = this.cls.get<Tenant>('tenant');

    const email = dto.email.trim().toLowerCase();
    const user = await userRepo.findOne({
      where: { email },
      relations: ['department', 'designation'],
    });

    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    if (user.status === UserStatus.INACTIVE) {
      throw new UnauthorizedException('Your account has been deactivated. Please contact your organization administrator.');
    }

    const isMatch = await bcrypt.compare(dto.password, user.password_hash);
    if (!isMatch) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const payload = {
      sub: user.id,
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      tenant_id: tenant.id,
      department_id: user.department_id,
    };

    const accessToken = this.jwtService.sign(payload, {
      secret: process.env.JWT_ACCESS_SECRET || 'chat-task-jwt-access-secret-32-chars-long-secure',
      expiresIn: process.env.JWT_ACCESS_EXPIRATION || '15m',
    });

    // Create rotating refresh token
    const rawRefreshToken = crypto.randomBytes(40).toString('hex');
    const hashedRefreshToken = await bcrypt.hash(rawRefreshToken, 10);

    const refreshRepo = dataSource.getRepository(RefreshToken);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

    await refreshRepo.save(
      refreshRepo.create({
        user_id: user.id,
        token_hash: hashedRefreshToken,
        is_revoked: false,
        expires_at: expiresAt,
      }),
    );

    return {
      access_token: accessToken,
      refresh_token: `${user.id}.${rawRefreshToken}`,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        avatar_url: user.avatar_url,
        department_id: user.department_id,
        department: user.department,
        designation: user.designation,
      },
      tenant: {
        id: tenant.id,
        name: tenant.name,
        subdomain: tenant.subdomain,
      },
    };
  }

  async refreshToken(refreshTokenWithUserId: string): Promise<{ access_token: string; refresh_token: string }> {
    const dataSource = await this.tenantConnectionService.getDataSourceForCurrentRequest();
    const refreshRepo = dataSource.getRepository(RefreshToken);
    const userRepo = dataSource.getRepository(User);
    const tenant = this.cls.get<Tenant>('tenant');

    const parts = refreshTokenWithUserId.split('.');
    if (parts.length !== 2) {
      throw new UnauthorizedException('Invalid refresh token format');
    }

    const [userId, rawToken] = parts;
    const user = await userRepo.findOne({ where: { id: userId } });

    if (!user || user.status === UserStatus.INACTIVE) {
      throw new UnauthorizedException('User account inactive or not found');
    }

    const tokens = await refreshRepo.find({
      where: { user_id: userId, is_revoked: false },
      order: { created_at: 'DESC' },
    });

    let matchedToken: RefreshToken | null = null;
    for (const t of tokens) {
      if (new Date() > t.expires_at) {
        continue;
      }
      const match = await bcrypt.compare(rawToken, t.token_hash);
      if (match) {
        matchedToken = t;
        break;
      }
    }

    if (!matchedToken) {
      throw new UnauthorizedException('Refresh token is invalid or expired');
    }

    // Revoke used token (token rotation)
    await refreshRepo.update(matchedToken.id, { is_revoked: true });

    // Issue new pair
    const payload = {
      sub: user.id,
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      tenant_id: tenant.id,
      department_id: user.department_id,
    };

    const newAccessToken = this.jwtService.sign(payload, {
      secret: process.env.JWT_ACCESS_SECRET || 'chat-task-jwt-access-secret-32-chars-long-secure',
      expiresIn: process.env.JWT_ACCESS_EXPIRATION || '15m',
    });

    const newRawRefreshToken = crypto.randomBytes(40).toString('hex');
    const newHashedRefreshToken = await bcrypt.hash(newRawRefreshToken, 10);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await refreshRepo.save(
      refreshRepo.create({
        user_id: user.id,
        token_hash: newHashedRefreshToken,
        is_revoked: false,
        expires_at: expiresAt,
      }),
    );

    return {
      access_token: newAccessToken,
      refresh_token: `${user.id}.${newRawRefreshToken}`,
    };
  }

  async logout(userId: string): Promise<void> {
    const dataSource = await this.tenantConnectionService.getDataSourceForCurrentRequest();
    const refreshRepo = dataSource.getRepository(RefreshToken);
    await refreshRepo.update({ user_id: userId, is_revoked: false }, { is_revoked: true });
  }

  async deactivateUser(userId: string): Promise<void> {
    const dataSource = await this.tenantConnectionService.getDataSourceForCurrentRequest();
    const userRepo = dataSource.getRepository(User);
    const refreshRepo = dataSource.getRepository(RefreshToken);

    await userRepo.update(userId, { status: UserStatus.INACTIVE });
    // Revoke all refresh tokens immediately as specified!
    await refreshRepo.update({ user_id: userId }, { is_revoked: true });
  }

  async inviteUser(dto: InviteUserDto): Promise<{ inviteLink: string; token: string }> {
    const dataSource = await this.tenantConnectionService.getDataSourceForCurrentRequest();
    const inviteRepo = dataSource.getRepository(Invitation);
    const userRepo = dataSource.getRepository(User);

    const email = dto.email.trim().toLowerCase();
    const existingUser = await userRepo.findOne({ where: { email } });
    if (existingUser) {
      throw new BadRequestException('A user with this email already exists in this organization');
    }

    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days valid

    await inviteRepo.save(
      inviteRepo.create({
        email,
        role: dto.role || UserRole.MEMBER,
        department_id: dto.department_id,
        branch_id: dto.branch_id,
        designation_id: dto.designation_id,
        token,
        expires_at: expiresAt,
      }),
    );

    const webUrl = process.env.WEB_URL || 'http://localhost:5173';
    return {
      token,
      inviteLink: `${webUrl}/accept-invite?token=${token}`,
    };
  }

  async acceptInvite(token: string, password: string, name: string): Promise<User> {
    const dataSource = await this.tenantConnectionService.getDataSourceForCurrentRequest();
    const inviteRepo = dataSource.getRepository(Invitation);
    const userRepo = dataSource.getRepository(User);

    const invite = await inviteRepo.findOne({ where: { token, is_accepted: false } });
    if (!invite || new Date() > invite.expires_at) {
      throw new BadRequestException('Invite link is invalid or has expired');
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await userRepo.save(
      userRepo.create({
        name,
        email: invite.email,
        password_hash: passwordHash,
        role: invite.role,
        department_id: invite.department_id,
        branch_id: invite.branch_id,
        designation_id: invite.designation_id,
        status: UserStatus.ACTIVE,
      }),
    );

    await inviteRepo.update(invite.id, { is_accepted: true });
    return user;
  }
}
