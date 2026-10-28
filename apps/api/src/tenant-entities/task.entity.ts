import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { TaskPriority } from '@saas/shared';
import { User } from './user.entity';
import { TaskStatus } from './task-status.entity';
import { Department } from './department.entity';
import { TaskAssignee } from './task-assignee.entity';
import { TaskWatcher } from './task-watcher.entity';
import { TaskChecklist } from './task-checklist.entity';
import { TaskComment } from './task-comment.entity';
import { TaskActivity } from './task-activity.entity';
import { TaskExtensionRequest } from './task-extension-request.entity';
import { TaskLinkedTask } from './task-linked-task.entity';

@Entity('tasks')
@Index(['status_id'])
@Index(['due_date'])
@Index(['conversation_id'])
export class Task {
  // UUIDv7 primary key
  @PrimaryColumn({ type: 'varchar', length: 50 })
  id!: string;

  @Column({ type: 'varchar', length: 255 })
  title!: string;

  @Column({ type: 'text', nullable: true })
  description?: string | null;

  @Index()
  @Column({ type: 'uuid' })
  creator_id!: string;

  @ManyToOne(() => User, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'creator_id' })
  creator?: User;

  @Column({ type: 'uuid' })
  status_id!: string;

  @ManyToOne(() => TaskStatus, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'status_id' })
  status?: TaskStatus;

  @Column({
    type: 'enum',
    enum: TaskPriority,
    default: TaskPriority.MEDIUM,
  })
  priority!: TaskPriority;

  @Column({ type: 'uuid', nullable: true })
  department_id?: string | null;

  @ManyToOne(() => Department, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'department_id' })
  department?: Department;

  @Column({ type: 'varchar', length: 50, nullable: true })
  parent_task_id?: string | null;

  @ManyToOne(() => Task, (t) => t.subtasks, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'parent_task_id' })
  parent_task?: Task;

  @OneToMany(() => Task, (t) => t.parent_task)
  subtasks?: Task[];

  // Source chat & message links
  @Column({ type: 'varchar', length: 50, nullable: true })
  source_message_id?: string | null;

  @Column({ type: 'uuid', nullable: true })
  conversation_id?: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  start_date?: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  due_date?: Date | null;

  @Column({ type: 'float', nullable: true })
  estimated_hours?: number | null;

  @Column({ type: 'boolean', default: false })
  requires_approval!: boolean;

  @Column({ type: 'boolean', default: false })
  proof_required!: boolean;

  @Column({ type: 'jsonb', default: [] })
  proof_attachments!: Array<{
    name: string;
    url: string;
    size: number;
    mime_type: string;
  }>;

  @Column({ type: 'text', nullable: true })
  proof_notes?: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  recurrence_rule?: string | null;

  @Column({ type: 'jsonb', default: [] })
  labels!: string[];

  @OneToMany(() => TaskAssignee, (a) => a.task, { cascade: true })
  assignees?: TaskAssignee[];

  @OneToMany(() => TaskWatcher, (w) => w.task, { cascade: true })
  watchers?: TaskWatcher[];

  @OneToMany(() => TaskChecklist, (c) => c.task, { cascade: true })
  checklist?: TaskChecklist[];

  @OneToMany(() => TaskComment, (comm) => comm.task)
  comments?: TaskComment[];

  @OneToMany(() => TaskActivity, (act) => act.task)
  activities?: TaskActivity[];

  @OneToMany(() => TaskExtensionRequest, (ext) => ext.task)
  extension_requests?: TaskExtensionRequest[];

  @OneToMany(() => TaskLinkedTask, (lt) => lt.task)
  linked_tasks?: TaskLinkedTask[];

  @CreateDateColumn({ type: 'timestamptz' })
  created_at!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at!: Date;
}
