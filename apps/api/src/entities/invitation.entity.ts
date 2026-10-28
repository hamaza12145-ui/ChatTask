import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';
import { UserRole } from '@saas/shared';

@Entity('invitations')
export class Invitation {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column({ type: 'varchar', length: 150 })
  email!: string;

  @Column({
    type: 'enum',
    enum: UserRole,
    default: UserRole.MEMBER,
  })
  role!: UserRole;

  @Column({ type: 'uuid', nullable: true })
  department_id?: string | null;

  @Column({ type: 'uuid', nullable: true })
  branch_id?: string | null;

  @Column({ type: 'uuid', nullable: true })
  designation_id?: string | null;

  @Index({ unique: true })
  @Column({ type: 'varchar', length: 255, unique: true })
  token!: string;

  @Column({ type: 'boolean', default: false })
  is_accepted!: boolean;

  @Column({ type: 'timestamp' })
  expires_at!: Date;

  @CreateDateColumn()
  created_at!: Date;
}
