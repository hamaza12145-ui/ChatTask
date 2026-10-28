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

@Entity('task_checklists')
export class TaskChecklist {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column({ type: 'varchar', length: 50 })
  task_id!: string;

  @ManyToOne(() => Task, (t) => t.checklist, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'task_id' })
  task?: Task;

  @Column({ type: 'varchar', length: 255 })
  title!: string;

  @Column({ type: 'boolean', default: false })
  is_completed!: boolean;

  @Column({ type: 'int', default: 0 })
  order!: number;

  @CreateDateColumn()
  created_at!: Date;
}
