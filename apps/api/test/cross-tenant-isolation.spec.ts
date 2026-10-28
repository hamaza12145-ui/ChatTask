import * as dotenv from 'dotenv';
dotenv.config();

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { RealtimeService } from '../src/realtime/realtime.service';
import { LocalStorageDriver } from '../src/storage/drivers/local-storage.driver';

describe('Cross-Tenant Security Isolation Test Suite (REQUIRED)', () => {
  let app: INestApplication;
  let realtimeService: RealtimeService;
  let localStorageDriver: LocalStorageDriver;

  let tokenA: string; // Tenant Acme User
  let tenantAId: string;
  let tokenB: string; // Tenant Globex User
  let tenantBId: string;

  beforeAll(async () => {
    try {
      const moduleFixture: TestingModule = await Test.createTestingModule({
        imports: [AppModule],
      }).compile();

      app = moduleFixture.createNestApplication();
      await app.init();

      realtimeService = moduleFixture.get<RealtimeService>(RealtimeService);
      localStorageDriver = moduleFixture.get<LocalStorageDriver>(LocalStorageDriver);

      // 1. Authenticate user of Tenant A (acme)
      const resA = await request(app.getHttpServer())
        .post('/api/auth/login')
        .set('X-Tenant', 'acme')
        .send({ email: 'alice@acme.com', password: 'Password123!' });

      expect(resA.status).toBe(201);
      expect(resA.body.access_token).toBeDefined();
      tokenA = resA.body.access_token;
      tenantAId = resA.body.tenant.id;

      // 2. Authenticate user of Tenant B (globex)
      const resB = await request(app.getHttpServer())
        .post('/api/auth/login')
        .set('X-Tenant', 'globex')
        .send({ email: 'sarah@globex.com', password: 'Password123!' });

      expect(resB.status).toBe(201);
      expect(resB.body.access_token).toBeDefined();
      tokenB = resB.body.access_token;
      tenantBId = resB.body.tenant.id;

      expect(tenantAId).not.toEqual(tenantBId);
    } catch (err) {
      console.error('Error during test setup in beforeAll:', err);
      throw err;
    }
  }, 30000);

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  describe('1. REST API Cross-Tenant Isolation', () => {
    it('User of Tenant A CANNOT access endpoints of Tenant B using Token A (Mismatched Subdomain / Header)', async () => {
      // User A attempts to query conversations in Tenant B
      const response = await request(app.getHttpServer())
        .get('/api/chat/conversations')
        .set('X-Tenant', 'globex') // Target is Tenant B
        .set('Authorization', `Bearer ${tokenA}`); // Token is from Tenant A

      expect(response.status).toBe(401);
      expect(response.body.message).toContain('Cross-tenant access forbidden');
    });

    it('User of Tenant A CANNOT read tasks of Tenant B', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/tasks')
        .set('X-Tenant', 'globex')
        .set('Authorization', `Bearer ${tokenA}`);

      expect(response.status).toBe(401);
    });

    it('User of Tenant A CANNOT create tasks in Tenant B', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/tasks')
        .set('X-Tenant', 'globex')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({ title: 'Malicious Task Injection' });

      expect(response.status).toBe(401);
    });

    it('User of Tenant A CANNOT access organization departments or users of Tenant B', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/org/users')
        .set('X-Tenant', 'globex')
        .set('Authorization', `Bearer ${tokenA}`);

      expect(response.status).toBe(401);
    });
  });

  describe('2. Key Isolation & Tenant Prefixes', () => {
    it('Guarantees all presence & typing keys are strictly prefixed with tenant ID', async () => {
      const keyA = realtimeService.getKey(tenantAId, 'user:123:status');
      const keyB = realtimeService.getKey(tenantBId, 'user:123:status');

      expect(keyA).toMatch(new RegExp(`^${tenantAId}:`));
      expect(keyB).toMatch(new RegExp(`^${tenantBId}:`));
      expect(keyA).not.toEqual(keyB);
    });
  });

  describe('3. File Storage Isolation', () => {
    it('Pre-signed upload keys MUST be strictly scoped to caller tenant ID', async () => {
      const presigned = await localStorageDriver.getPresignedUploadUrl(
        tenantAId,
        'secret-document.pdf',
        'application/pdf',
      );

      expect(presigned.key.startsWith(`${tenantAId}/`)).toBe(true);
      expect(presigned.key.includes(tenantBId)).toBe(false);
    });

    it('Tenant A CANNOT delete files belonging to Tenant B prefix', async () => {
      const foreignKey = `${tenantBId}/confidential_report.pdf`;

      await expect(
        localStorageDriver.deleteFile(tenantAId, foreignKey),
      ).rejects.toThrow('Tenant isolation violation');
    });
  });
});
