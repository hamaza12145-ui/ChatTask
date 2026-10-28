import {
  Controller,
  Post,
  Body,
  UseGuards,
  Get,
  Param,
  BadRequestException,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import {
  LoginRequestDto,
  LoginResponseDto,
  RefreshTokenRequestDto,
  InviteUserDto,
  UserRole,
} from '@saas/shared';
import { JwtTenantGuard } from '../common/guards/jwt-tenant.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser, CurrentUserPayload } from '../common/decorators/current-user.decorator';

@Controller('api/auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  async login(@Body() dto: LoginRequestDto): Promise<LoginResponseDto> {
    if (!dto.email || !dto.password) {
      throw new BadRequestException('Email and password are required');
    }
    return this.authService.login(dto);
  }

  @Post('refresh')
  async refresh(@Body() dto: RefreshTokenRequestDto) {
    if (!dto.refresh_token) {
      throw new BadRequestException('Refresh token is required');
    }
    return this.authService.refreshToken(dto.refresh_token);
  }

  @Post('logout')
  @UseGuards(JwtTenantGuard)
  async logout(@CurrentUser() user: CurrentUserPayload) {
    await this.authService.logout(user.id);
    return { success: true, message: 'Logged out successfully' };
  }

  @Get('me')
  @UseGuards(JwtTenantGuard)
  async getMe(@CurrentUser() user: CurrentUserPayload) {
    return user;
  }

  @Post('invite')
  @UseGuards(JwtTenantGuard, RolesGuard)
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  async invite(@Body() dto: InviteUserDto) {
    return this.authService.inviteUser(dto);
  }

  @Post('accept-invite')
  async acceptInvite(@Body() body: { token: string; password: string; name: string }) {
    if (!body.token || !body.password || !body.name) {
      throw new BadRequestException('Token, password, and name are required');
    }
    const user = await this.authService.acceptInvite(body.token, body.password, body.name);
    return {
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
    };
  }
}
