import * as dotenv from 'dotenv';
dotenv.config();

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

describe('Application E2E & Integration Test Suite', () => {
  let app: INestApplication;
  let authToken: string;
  let currentUserId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    // 1. Authenticate with seeded Pakistani corporate CEO account
    const res = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: 'tariq@acme.com', password: 'Password123!' });

    expect(res.status).toBe(201);
    expect(res.body.access_token).toBeDefined();
    expect(res.body.user).toBeDefined();
    expect(res.body.user.email).toBe('tariq@acme.com');

    authToken = res.body.access_token;
    currentUserId = res.body.user.id;
  }, 30000);

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  describe('1. Authentication & Security', () => {
    it('Rejects requests to protected endpoints without JWT', async () => {
      const res = await request(app.getHttpServer()).get('/api/tasks');
      expect(res.status).toBe(401);
    });

    it('Allows authenticated requests with valid Bearer token', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.email).toBe('tariq@acme.com');
    });
  });

  describe('2. Task Management Workflows', () => {
    it('Fetches task statuses', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/tasks/statuses')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThanOrEqual(5);
    });

    it('Lists existing tasks', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/tasks')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThan(0);
    });

    it('Creates a new task successfully', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/tasks')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'System Modernization & Performance Verification',
          description: 'Verify general-purpose application operation',
          priority: 'HIGH',
        });

      expect(res.status).toBe(201);
      expect(res.body.id).toBeDefined();
      expect(res.body.title).toBe('System Modernization & Performance Verification');
    });
  });

  describe('3. Team Chat Workflows', () => {
    it('Fetches user conversations', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/chat/conversations')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThan(0);
    });
  });

  describe('4. Organization & Reports', () => {
    it('Fetches organization departments', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/org/departments')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThanOrEqual(6);
    });

    it('Fetches personal dashboard report metrics', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/reports/personal')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.due_today).toBeDefined();
      expect(res.body.total_active).toBeDefined();
    });
  });
});
