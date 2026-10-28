import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { TaskRelationType } from '@saas/shared';
import { Task } from './task.entity';

@Entity('task_linked_tasks')
@Index(['task_id', 'linked_task_id'], { unique: true })
export class TaskLinkedTask {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 50 })
  task_id!: string;

  @ManyToOne(() => Task, (t) => t.linked_tasks, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'task_id' })
  task?: Task;

  @Column({ type: 'varchar', length: 50 })
  linked_task_id!: string;

  @ManyToOne(() => Task, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'linked_task_id' })
  linked_task?: Task;

  @Column({
    type: 'enum',
    enum: TaskRelationType,
    default: TaskRelationType.RELATED,
  })
  relation_type!: TaskRelationType;
}
