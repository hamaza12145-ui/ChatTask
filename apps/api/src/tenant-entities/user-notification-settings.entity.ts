import { Entity, PrimaryColumn, Column, UpdateDateColumn } from 'typeorm';

@Entity('user_notification_settings')
export class UserNotificationSettings {
  @PrimaryColumn({ type: 'uuid' })
  user_id!: string;

  @Column({ type: 'boolean', default: false })
  mute_chats!: boolean;

  @Column({ type: 'boolean', default: false })
  mute_tasks!: boolean;

  @Column({ type: 'boolean', default: false })
  quiet_hours_enabled!: boolean;

  @Column({ type: 'varchar', length: 10, default: '22:00' })
  quiet_hours_start!: string;

  @Column({ type: 'varchar', length: 10, default: '08:00' })
  quiet_hours_end!: string;

  @Column({ type: 'boolean', default: true })
  email_notifications!: boolean;

  @Column({ type: 'boolean', default: true })
  push_notifications!: boolean;

  @Column({ type: 'jsonb', nullable: true })
  push_subscription?: {
    endpoint: string;
    keys: {
      p256dh: string;
      auth: string;
    };
  } | null;

  @UpdateDateColumn()
  updated_at!: Date;
}
