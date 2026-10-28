import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import {
  Department,
  Branch,
  Designation,
  User,
  Role,
  AuditLog,
} from '../entities';
import {
  CreateDepartmentDto,
  CreateBranchDto,
  CreateDesignationDto,
  UserRole,
  UserStatus,
  AuditAction,
} from '@saas/shared';

@Injectable()
export class OrganizationService {
  constructor(@InjectDataSource() private readonly ds: DataSource) {}

  async getDepartments(): Promise<Department[]> {
    return this.ds.getRepository(Department).find({
      relations: ['children'],
      order: { name: 'ASC' },
    });
  }

  async createDepartment(dto: CreateDepartmentDto, actorId: string): Promise<Department> {
    const repo = this.ds.getRepository(Department);
    const dept = await repo.save(repo.create({
      name: dto.name,
      parent_id: dto.parent_id,
    }));

    await this.logAction(actorId, AuditAction.DEPARTMENT_CREATED, 'Department', dept.id, { name: dept.name });
    return dept;
  }

  async getBranches(): Promise<Branch[]> {
    return this.ds.getRepository(Branch).find({ order: { name: 'ASC' } });
  }

  async createBranch(dto: CreateBranchDto, actorId: string): Promise<Branch> {
    const repo = this.ds.getRepository(Branch);
    const branch = await repo.save(repo.create(dto));

    await this.logAction(actorId, AuditAction.BRANCH_CREATED, 'Branch', branch.id, { name: branch.name });
    return branch;
  }

  async getDesignations(): Promise<Designation[]> {
    return this.ds.getRepository(Designation).find({ order: { title: 'ASC' } });
  }

  async createDesignation(dto: CreateDesignationDto): Promise<Designation> {
    const repo = this.ds.getRepository(Designation);
    return repo.save(repo.create(dto));
  }

  async getUsers(): Promise<User[]> {
    return this.ds.getRepository(User).find({
      relations: ['department', 'branch', 'designation'],
      order: { name: 'ASC' },
    });
  }

  async updateUser(
    userId: string,
    data: { role?: UserRole; department_id?: string; branch_id?: string; designation_id?: string },
    actorId: string,
  ): Promise<User> {
    const userRepo = this.ds.getRepository(User);
    const user = await userRepo.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (data.role && user.role !== data.role) {
      await this.logAction(actorId, AuditAction.USER_ROLE_CHANGED, 'User', user.id, {
        old_role: user.role,
        new_role: data.role,
      });
      user.role = data.role;
    }

    if (data.department_id !== undefined) user.department_id = data.department_id;
    if (data.branch_id !== undefined) user.branch_id = data.branch_id;
    if (data.designation_id !== undefined) user.designation_id = data.designation_id;

    return userRepo.save(user);
  }

  async deactivateUser(userId: string, actorId: string): Promise<void> {
    const userRepo = this.ds.getRepository(User);
    const user = await userRepo.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    user.status = UserStatus.INACTIVE;
    await userRepo.save(user);

    await this.logAction(actorId, AuditAction.USER_DEACTIVATED, 'User', user.id, {
      name: user.name,
      email: user.email,
    });
  }

  async getAuditLogs(): Promise<AuditLog[]> {
    return this.ds.getRepository(AuditLog).find({
      order: { created_at: 'DESC' },
      take: 100,
    });
  }

  private async logAction(
    actorId: string,
    action: string,
    entityType: string,
    entityId: string,
    details: Record<string, any>,
  ): Promise<void> {
    const auditRepo = this.ds.getRepository(AuditLog);
    await auditRepo.save(
      auditRepo.create({
        user_id: actorId,
        action,
        entity_type: entityType,
        entity_id: entityId,
        details,
      }),
    );
  }
}
