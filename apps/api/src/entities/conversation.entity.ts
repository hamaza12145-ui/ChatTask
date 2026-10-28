import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { ConversationType } from '@saas/shared';
import { ConversationMember } from './conversation-member.entity';

@Entity('conversations')
export class Conversation {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({
    type: 'enum',
    enum: ConversationType,
    default: ConversationType.DIRECT,
  })
  type!: ConversationType;

  @Column({ type: 'varchar', length: 150, nullable: true })
  title?: string | null;

  @Column({ type: 'text', nullable: true })
  description?: string | null;

  @Column({ type: 'text', nullable: true })
  avatar_url?: string | null;

  @Column({ type: 'uuid', nullable: true })
  department_id?: string | null;

  @Column({ type: 'boolean', default: false })
  is_readonly!: boolean;

  @Column({ type: 'uuid', nullable: true })
  created_by?: string | null;

  @OneToMany(() => ConversationMember, (m) => m.conversation)
  members?: ConversationMember[];

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;
}
