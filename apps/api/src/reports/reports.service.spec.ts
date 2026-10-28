import { ReportsService } from './reports.service';
import { TenantConnectionService } from '../tenancy/tenant-connection.service';

describe('ReportsService', () => {
  let service: ReportsService;
  let mockTenantConnectionService: Partial<TenantConnectionService>;
  let mockTaskRepo: any;

  beforeEach(() => {
    mockTaskRepo = {
      createQueryBuilder: jest.fn().mockReturnValue({
        innerJoin: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getCount: jest.fn().mockResolvedValue(5),
      }),
    };

    mockTenantConnectionService = {
      getDataSourceForCurrentRequest: jest.fn().mockResolvedValue({
        getRepository: jest.fn().mockReturnValue(mockTaskRepo),
      }),
    };

    service = new ReportsService(mockTenantConnectionService as TenantConnectionService);
  });

  it('should calculate personal dashboard metrics correctly', async () => {
    const res = await service.getPersonalDashboard('user-123');

    expect(res).toBeDefined();
    expect(res.due_today).toBe(5);
    expect(res.overdue).toBe(5);
    expect(res.completed_this_week).toBe(5);
    expect(res.total_active).toBe(5);
  });
});
