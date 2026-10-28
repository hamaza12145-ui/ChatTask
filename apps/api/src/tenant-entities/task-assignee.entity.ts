import {
  Entity,
  PrimaryColumn,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Task } from './task.entity';
import { User } from './user.entity';

@Entity('task_assignees')
@Index(['task_id', 'user_id'], { unique: true })
export class TaskAssignee {
  @PrimaryColumn({ type: 'varchar', length: 50 })
  task_id!: string;

  @ManyToOne(() => Task, (t) => t.assignees, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'task_id' })
  task?: Task;

  @PrimaryColumn({ type: 'uuid' })
  user_id!: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user?: User;

  @CreateDateColumn({ type: 'timestamptz' })
  assigned_at!: Date;
}
