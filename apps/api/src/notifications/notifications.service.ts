import { Injectable, Logger } from '@nestjs/common';
import * as webpush from 'web-push';
import { TenantConnectionService } from '../tenancy/tenant-connection.service';
import { Notification, UserNotificationSettings } from '../tenant-entities';
import { NotificationType } from '@saas/shared';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(private readonly tenantConnectionService: TenantConnectionService) {
    const vapidPublic = process.env.VAPID_PUBLIC_KEY;
    const vapidPrivate = process.env.VAPID_PRIVATE_KEY;
    const vapidSubject = process.env.VAPID_SUBJECT || 'mailto:admin@example.com';

    if (vapidPublic && vapidPrivate) {
      try {
        webpush.setVapidDetails(vapidSubject, vapidPublic, vapidPrivate);
      } catch (err: any) {
        this.logger.warn(`VAPID setup warning: ${err.message}`);
      }
    }
  }

  async getUserNotifications(userId: string): Promise<Notification[]> {
    const ds = await this.tenantConnectionService.getDataSourceForCurrentRequest();
    const repo = ds.getRepository(Notification);
    return repo.find({
      where: { user_id: userId },
      order: { created_at: 'DESC' },
      take: 50,
    });
  }

  async markAsRead(notificationId: string, userId: string): Promise<void> {
    const ds = await this.tenantConnectionService.getDataSourceForCurrentRequest();
    const repo = ds.getRepository(Notification);
    await repo.update({ id: notificationId, user_id: userId }, { is_read: true });
  }

  async markAllAsRead(userId: string): Promise<void> {
    const ds = await this.tenantConnectionService.getDataSourceForCurrentRequest();
    const repo = ds.getRepository(Notification);
    await repo.update({ user_id: userId, is_read: false }, { is_read: true });
  }

  async getSettings(userId: string): Promise<UserNotificationSettings> {
    const ds = await this.tenantConnectionService.getDataSourceForCurrentRequest();
    const repo = ds.getRepository(UserNotificationSettings);
    let settings = await repo.findOne({ where: { user_id: userId } });
    if (!settings) {
      settings = await repo.save(
        repo.create({
          user_id: userId,
          mute_chats: false,
          mute_tasks: false,
          quiet_hours_enabled: false,
          email_notifications: true,
          push_notifications: true,
        }),
      );
    }
    return settings;
  }

  async updateSettings(userId: string, update: Partial<UserNotificationSettings>): Promise<UserNotificationSettings> {
    const ds = await this.tenantConnectionService.getDataSourceForCurrentRequest();
    const repo = ds.getRepository(UserNotificationSettings);
    await repo.update({ user_id: userId }, update);
    return this.getSettings(userId);
  }

  async registerPushSubscription(userId: string, subscription: any): Promise<void> {
    const ds = await this.tenantConnectionService.getDataSourceForCurrentRequest();
    const repo = ds.getRepository(UserNotificationSettings);
    await repo.update({ user_id: userId }, { push_subscription: subscription, push_notifications: true });
  }

  async sendPushNotification(subscription: any, title: string, body: string, data?: any) {
    if (!subscription || !subscription.endpoint) return;
    try {
      const payload = JSON.stringify({
        title,
        body,
        data,
      });
      await webpush.sendNotification(subscription, payload);
    } catch (err: any) {
      this.logger.warn(`Push notification failed: ${err.message}`);
    }
  }
}
