import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

@Entity('message_reactions')
@Index(['message_id', 'user_id', 'emoji'], { unique: true })
export class MessageReaction {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 50 })
  message_id!: string;

  @Column({ type: 'uuid' })
  user_id!: string;

  @Column({ type: 'varchar', length: 32 })
  emoji!: string;

  @CreateDateColumn()
  created_at!: Date;
}
