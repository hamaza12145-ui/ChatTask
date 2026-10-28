import {
  Controller,
  Get,
  Post,
  Put,
  Param,
  Body,
  UseGuards,
} from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { JwtTenantGuard } from '../common/guards/jwt-tenant.guard';
import { CurrentUser, CurrentUserPayload } from '../common/decorators/current-user.decorator';

@Controller('api/notifications')
@UseGuards(JwtTenantGuard)
export class NotificationsController {
  constructor(private readonly notifService: NotificationsService) {}

  @Get()
  async getNotifications(@CurrentUser() user: CurrentUserPayload) {
    return this.notifService.getUserNotifications(user.id);
  }

  @Post(':id/read')
  async markRead(
    @Param('id') notifId: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    await this.notifService.markAsRead(notifId, user.id);
    return { success: true };
  }

  @Post('read-all')
  async markAllRead(@CurrentUser() user: CurrentUserPayload) {
    await this.notifService.markAllAsRead(user.id);
    return { success: true };
  }

  @Get('settings')
  async getSettings(@CurrentUser() user: CurrentUserPayload) {
    return this.notifService.getSettings(user.id);
  }

  @Put('settings')
  async updateSettings(
    @CurrentUser() user: CurrentUserPayload,
    @Body() body: any,
  ) {
    return this.notifService.updateSettings(user.id, body);
  }

  @Post('push-subscription')
  async subscribePush(
    @CurrentUser() user: CurrentUserPayload,
    @Body() subscription: any,
  ) {
    await this.notifService.registerPushSubscription(user.id, subscription);
    return { success: true };
  }
}
