import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

@Entity('tenant_migration_log')
export class TenantMigrationLog {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column({ type: 'uuid' })
  tenant_id!: string;

  @Column({ type: 'varchar', length: 255 })
  migration_name!: string;

  @Column({ type: 'varchar', length: 50, default: 'SUCCESS' })
  status!: string;

  @Column({ type: 'text', nullable: true })
  error?: string | null;

  @CreateDateColumn()
  applied_at!: Date;
}
