import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

@Entity('audit_logs')
export class AuditLog {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column({ type: 'uuid', nullable: true })
  user_id?: string | null;

  @Column({ type: 'varchar', length: 100 })
  action!: string;

  @Column({ type: 'varchar', length: 100 })
  entity_type!: string;

  @Column({ type: 'varchar', length: 100 })
  entity_id!: string;

  @Column({ type: 'jsonb', default: {} })
  details!: Record<string, any>;

  @Column({ type: 'varchar', length: 45, nullable: true })
  ip_address?: string | null;

  @Column({ type: 'text', nullable: true })
  user_agent?: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at!: Date;
}
