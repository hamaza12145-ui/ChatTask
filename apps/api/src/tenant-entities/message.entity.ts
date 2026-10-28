import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { MessageType, MessageDeliveryStatus } from '@saas/shared';
import { Conversation } from './conversation.entity';
import { User } from './user.entity';

@Entity('messages')
@Index(['conversation_id', 'created_at'])
export class Message {
  // UUIDv7 primary key generated on client or server
  @PrimaryColumn({ type: 'varchar', length: 50 })
  id!: string;

  @Index()
  @Column({ type: 'uuid' })
  conversation_id!: string;

  @ManyToOne(() => Conversation, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'conversation_id' })
  conversation?: Conversation;

  @Index()
  @Column({ type: 'uuid' })
  sender_id!: string;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'sender_id' })
  sender?: User;

  @Column({
    type: 'enum',
    enum: MessageType,
    default: MessageType.TEXT,
  })
  type!: MessageType;

  @Column({ type: 'text' })
  content!: string;

  @Column({ type: 'jsonb', default: [] })
  attachments!: Array<{
    name: string;
    url: string;
    size: number;
    mime_type: string;
    width?: number;
    height?: number;
    duration?: number;
  }>;

  @Column({ type: 'varchar', length: 50, nullable: true })
  parent_message_id?: string | null;

  @Column({ type: 'uuid', nullable: true })
  task_id?: string | null;

  @Column({
    type: 'enum',
    enum: MessageDeliveryStatus,
    default: MessageDeliveryStatus.SENT,
  })
  delivery_status!: MessageDeliveryStatus;

  @Column({ type: 'boolean', default: false })
  is_edited!: boolean;

  @Column({ type: 'boolean', default: false })
  is_deleted!: boolean;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at!: Date;
}
