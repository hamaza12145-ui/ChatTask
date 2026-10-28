import { AuthService } from './auth.service';
import { JwtService } from '@nestjs/jwt';
import { ClsService } from 'nestjs-cls';
import { TenantConnectionService } from '../tenancy/tenant-connection.service';
import { UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';

describe('AuthService', () => {
  let service: AuthService;
  let mockJwtService: Partial<JwtService>;
  let mockClsService: Partial<ClsService>;
  let mockTenantConnectionService: Partial<TenantConnectionService>;
  let mockUserRepo: any;
  let mockRefreshRepo: any;

  beforeEach(async () => {
    const passwordHash = await bcrypt.hash('Password123!', 10);

    mockUserRepo = {
      findOne: jest.fn().mockImplementation(({ where }) => {
        if (where.email === 'alice@acme.com') {
          return Promise.resolve({
            id: 'user-alice-123',
            email: 'alice@acme.com',
            name: 'Alice Smith',
            role: 'ADMIN',
            status: 'active',
            password_hash: passwordHash,
            department: { name: 'IT' },
            designation: { title: 'Lead Engineer' },
          });
        }
        return Promise.resolve(null);
      }),
    };

    mockRefreshRepo = {
      create: jest.fn().mockImplementation((val) => val),
      save: jest.fn().mockResolvedValue({}),
    };

    mockTenantConnectionService = {
      getDataSourceForCurrentRequest: jest.fn().mockResolvedValue({
        getRepository: jest.fn().mockImplementation((entity) => {
          if (entity.name === 'User') return mockUserRepo;
          return mockRefreshRepo;
        }),
      }),
    };

    mockJwtService = {
      sign: jest.fn().mockReturnValue('mock-jwt-token'),
    };

    mockClsService = {
      get: jest.fn().mockReturnValue({
        id: 'tenant-123',
        name: 'Acme Corp',
        subdomain: 'acme',
      }),
    };

    service = new AuthService(
      mockJwtService as JwtService,
      mockClsService as ClsService,
      mockTenantConnectionService as TenantConnectionService,
    );
  });

  it('should authenticate user with valid credentials', async () => {
    const res = await service.login({
      email: 'alice@acme.com',
      password: 'Password123!',
    });

    expect(res).toBeDefined();
    expect(res.access_token).toBe('mock-jwt-token');
    expect(res.user.email).toBe('alice@acme.com');
    expect(res.tenant.subdomain).toBe('acme');
  });

  it('should throw UnauthorizedException on wrong password', async () => {
    await expect(
      service.login({
        email: 'alice@acme.com',
        password: 'WrongPassword!',
      }),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('should throw UnauthorizedException if user not found', async () => {
    await expect(
      service.login({
        email: 'nonexistent@acme.com',
        password: 'Password123!',
      }),
    ).rejects.toThrow(UnauthorizedException);
  });
});
