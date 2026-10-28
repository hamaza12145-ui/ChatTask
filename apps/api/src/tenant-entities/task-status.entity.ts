import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';
import { TaskStatusCategory } from '@saas/shared';

@Entity('task_statuses')
export class TaskStatus {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column({ type: 'varchar', length: 50 })
  name!: string;

  @Column({
    type: 'enum',
    enum: TaskStatusCategory,
    default: TaskStatusCategory.TODO,
  })
  category!: TaskStatusCategory;

  @Column({ type: 'varchar', length: 20, default: '#64748b' })
  color!: string;

  @Column({ type: 'int', default: 0 })
  order!: number;

  @Column({ type: 'boolean', default: false })
  is_closed!: boolean;

  @Column({ type: 'boolean', default: false })
  requires_approval!: boolean;

  @CreateDateColumn()
  created_at!: Date;
}
