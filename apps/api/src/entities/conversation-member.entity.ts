import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Conversation } from './conversation.entity';
import { User } from './user.entity';

@Entity('conversation_members')
@Index(['conversation_id', 'user_id'], { unique: true })
export class ConversationMember {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  conversation_id!: string;

  @ManyToOne(() => Conversation, (conv) => conv.members, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'conversation_id' })
  conversation?: Conversation;

  @Column({ type: 'uuid' })
  user_id!: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user?: User;

  @Column({ type: 'boolean', default: false })
  is_admin!: boolean;

  // Read receipts stored as last_read_message_id per member per conversation
  @Column({ type: 'varchar', length: 50, nullable: true })
  last_read_message_id?: string | null;

  @Column({ type: 'boolean', default: false })
  muted!: boolean;

  @CreateDateColumn()
  joined_at!: Date;
}
