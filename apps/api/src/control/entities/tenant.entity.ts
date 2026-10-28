import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { TenantStatus } from '@saas/shared';

@Entity('tenants')
export class Tenant {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 100 })
  name!: string;

  @Index({ unique: true })
  @Column({ type: 'varchar', length: 50, unique: true })
  subdomain!: string;

  @Column({ type: 'varchar', length: 100 })
  db_name!: string;

  @Column({ type: 'varchar', length: 255 })
  db_host!: string;

  @Column({ type: 'int', default: 5432 })
  db_port!: number;

  @Column({ type: 'varchar', length: 100 })
  db_user!: string;

  @Column({ type: 'text' })
  db_password_encrypted!: string;

  @Column({ type: 'varchar', length: 50, default: 'free' })
  plan!: string;

  @Column({
    type: 'enum',
    enum: TenantStatus,
    default: TenantStatus.PROVISIONING,
  })
  status!: TenantStatus;

  @Column({ type: 'int', default: 1 })
  schema_version!: number;

  @Column({ type: 'bigint', default: 0 })
  storage_used_bytes!: number;

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;
}
