import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Task } from './task.entity';
import { User } from './user.entity';

@Entity('task_activities')
export class TaskActivity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column({ type: 'varchar', length: 50 })
  task_id!: string;

  @ManyToOne(() => Task, (t) => t.activities, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'task_id' })
  task?: Task;

  @Index()
  @Column({ type: 'uuid', nullable: true })
  actor_id?: string | null;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'actor_id' })
  actor?: User;

  @Column({ type: 'varchar', length: 100 })
  action!: string; // 'STATUS_CHANGE', 'REASSIGN', 'FIELD_UPDATE', 'COMMENT_ADDED', etc.

  @Column({ type: 'varchar', length: 100, nullable: true })
  field_name?: string | null;

  @Column({ type: 'text', nullable: true })
  old_value?: string | null;

  @Column({ type: 'text', nullable: true })
  new_value?: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at!: Date;
}
