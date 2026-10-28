import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { ExtensionRequestStatus } from '@saas/shared';
import { Task } from './task.entity';
import { User } from './user.entity';

@Entity('task_extension_requests')
export class TaskExtensionRequest {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column({ type: 'varchar', length: 50 })
  task_id!: string;

  @ManyToOne(() => Task, (t) => t.extension_requests, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'task_id' })
  task?: Task;

  @Index()
  @Column({ type: 'uuid' })
  requested_by!: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'requested_by' })
  requester?: User;

  @Column({ type: 'timestamptz' })
  requested_date!: Date;

  @Column({ type: 'text' })
  reason!: string;

  @Column({
    type: 'enum',
    enum: ExtensionRequestStatus,
    default: ExtensionRequestStatus.PENDING,
  })
  status!: ExtensionRequestStatus;

  @Column({ type: 'uuid', nullable: true })
  reviewed_by?: string | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'reviewed_by' })
  reviewer?: User;

  @Column({ type: 'text', nullable: true })
  review_note?: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at!: Date;
}
