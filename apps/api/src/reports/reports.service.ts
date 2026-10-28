import { Injectable } from '@nestjs/common';
import { TenantConnectionService } from '../tenancy/tenant-connection.service';
import { Task, TaskStatus, User, Department } from '../tenant-entities';
import { TaskStatusCategory } from '@saas/shared';

@Injectable()
export class ReportsService {
  constructor(private readonly tenantConnectionService: TenantConnectionService) {}

  async getPersonalDashboard(userId: string) {
    const ds = await this.tenantConnectionService.getDataSourceForCurrentRequest();
    const taskRepo = ds.getRepository(Task);

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(now.getDate() - 7);

    // Tasks due today
    const dueToday = await taskRepo
      .createQueryBuilder('t')
      .innerJoin('t.assignees', 'a', 'a.user_id = :userId', { userId })
      .innerJoin('t.status', 's')
      .where('t.due_date >= :start AND t.due_date <= :end', { start: startOfToday, end: endOfToday })
      .andWhere('s.is_closed = false')
      .getCount();

    // Overdue tasks
    const overdue = await taskRepo
      .createQueryBuilder('t')
      .innerJoin('t.assignees', 'a', 'a.user_id = :userId', { userId })
      .innerJoin('t.status', 's')
      .where('t.due_date < :now', { now })
      .andWhere('s.is_closed = false')
      .getCount();

    // Completed this week
    const completedThisWeek = await taskRepo
      .createQueryBuilder('t')
      .innerJoin('t.assignees', 'a', 'a.user_id = :userId', { userId })
      .innerJoin('t.status', 's')
      .where('s.is_closed = true')
      .andWhere('t.updated_at >= :since', { since: sevenDaysAgo })
      .getCount();

    // Total active assigned
    const totalActive = await taskRepo
      .createQueryBuilder('t')
      .innerJoin('t.assignees', 'a', 'a.user_id = :userId', { userId })
      .innerJoin('t.status', 's')
      .where('s.is_closed = false')
      .getCount();

    return {
      due_today: dueToday,
      overdue,
      completed_this_week: completedThisWeek,
      total_active: totalActive,
    };
  }

  async getManagerDashboard() {
    const ds = await this.tenantConnectionService.getDataSourceForCurrentRequest();
    const userRepo = ds.getRepository(User);
    const deptRepo = ds.getRepository(Department);
    const taskRepo = ds.getRepository(Task);

    const users = await userRepo.find({ relations: ['department'] });
    const departments = await deptRepo.find();
    const now = new Date();

    // User metrics
    const userMetrics = await Promise.all(
      users.map(async (u) => {
        const assigned = await taskRepo
          .createQueryBuilder('t')
          .innerJoin('t.assignees', 'a', 'a.user_id = :uid', { uid: u.id })
          .getCount();

        const completed = await taskRepo
          .createQueryBuilder('t')
          .innerJoin('t.assignees', 'a', 'a.user_id = :uid', { uid: u.id })
          .innerJoin('t.status', 's')
          .where('s.is_closed = true')
          .getCount();

        const overdue = await taskRepo
          .createQueryBuilder('t')
          .innerJoin('t.assignees', 'a', 'a.user_id = :uid', { uid: u.id })
          .innerJoin('t.status', 's')
          .where('s.is_closed = false AND t.due_date < :now', { now })
          .getCount();

        const onTimeCompleted = await taskRepo
          .createQueryBuilder('t')
          .innerJoin('t.assignees', 'a', 'a.user_id = :uid', { uid: u.id })
          .innerJoin('t.status', 's')
          .where('s.is_closed = true AND (t.due_date IS NULL OR t.updated_at <= t.due_date)')
          .getCount();

        const onTimePercentage = completed > 0 ? Math.round((onTimeCompleted / completed) * 100) : 100;

        return {
          user_id: u.id,
          name: u.name,
          email: u.email,
          department_name: u.department?.name || 'None',
          assigned,
          completed,
          overdue,
          on_time_percentage: onTimePercentage,
        };
      }),
    );

    // Department metrics
    const departmentMetrics = await Promise.all(
      departments.map(async (d) => {
        const assigned = await taskRepo.count({ where: { department_id: d.id } });
        const completed = await taskRepo
          .createQueryBuilder('t')
          .innerJoin('t.status', 's')
          .where('t.department_id = :did AND s.is_closed = true', { did: d.id })
          .getCount();

        const overdue = await taskRepo
          .createQueryBuilder('t')
          .innerJoin('t.status', 's')
          .where('t.department_id = :did AND s.is_closed = false AND t.due_date < :now', { did: d.id, now })
          .getCount();

        return {
          department_id: d.id,
          name: d.name,
          assigned,
          completed,
          overdue,
        };
      }),
    );

    return {
      users: userMetrics,
      departments: departmentMetrics,
    };
  }

  async exportTasksToCsv(): Promise<string> {
    const ds = await this.tenantConnectionService.getDataSourceForCurrentRequest();
    const taskRepo = ds.getRepository(Task);

    const tasks = await taskRepo.find({
      relations: ['status', 'creator', 'department', 'assignees', 'assignees.user'],
      order: { created_at: 'DESC' },
    });

    const header = ['ID', 'Title', 'Status', 'Priority', 'Creator', 'Assignees', 'Department', 'Due Date', 'Created At'];
    const rows = tasks.map((t) => [
      t.id,
      `"${(t.title || '').replace(/"/g, '""')}"`,
      t.status?.name || '',
      t.priority,
      t.creator?.name || '',
      `"${(t.assignees?.map((a) => a.user?.name).filter(Boolean).join(', ') || '').replace(/"/g, '""')}"`,
      t.department?.name || '',
      t.due_date ? t.due_date.toISOString() : '',
      t.created_at.toISOString(),
    ]);

    return [header.join(','), ...rows.map((r) => r.join(','))].join('\n');
  }
}
