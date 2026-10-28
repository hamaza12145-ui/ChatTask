import { Entity, PrimaryColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('plans')
export class Plan {
  @PrimaryColumn({ type: 'varchar', length: 50 })
  id!: string; // 'free', 'pro', 'enterprise'

  @Column({ type: 'varchar', length: 100 })
  name!: string;

  @Column({ type: 'int', default: 20 })
  max_users!: number;

  @Column({ type: 'bigint', default: 10737418240 }) // 10 GB
  storage_limit_bytes!: number;

  @Column({ type: 'jsonb', default: {} })
  features!: Record<string, any>;

  @CreateDateColumn()
  created_at!: Date;
}
