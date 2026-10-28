import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import Redis from 'ioredis';

@Injectable()
export class RealtimeService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RealtimeService.name);
  private redisClient?: Redis;
  private readonly useRedis: boolean;

  // In-Memory Storage (Zero-Redis Architecture)
  private memorySockets = new Map<string, Set<string>>(); // `${tenantId}:user:${userId}` -> Set<socketId>
  private memoryPresence = new Map<string, { status: string; last_seen?: number }>();
  private memoryTyping = new Map<string, NodeJS.Timeout>(); // key -> timeout

  constructor() {
    this.useRedis = process.env.USE_REDIS === 'true';
  }

  onModuleInit() {
    if (this.useRedis) {
      const host = process.env.REDIS_HOST || '127.0.0.1';
      const port = parseInt(process.env.REDIS_PORT || '6379', 10);
      const password = process.env.REDIS_PASSWORD || undefined;

      this.redisClient = new Redis({
        host,
        port,
        password,
        lazyConnect: true,
        retryStrategy: (times) => Math.min(times * 100, 3000),
      });

      this.redisClient.connect().then(() => {
        this.logger.log(`Connected to Redis at ${host}:${port}`);
      }).catch((err) => {
        this.logger.warn(`Redis connection failed. Falling back to In-Memory mode: ${err.message}`);
        this.redisClient = undefined;
      });
    } else {
      this.logger.log('Running in Zero-Redis In-Memory mode (PostgreSQL-centric architecture)');
    }
  }

  onModuleDestroy() {
    if (this.redisClient) {
      this.redisClient.disconnect();
    }
    // Clear all in-memory timeouts
    for (const timeout of this.memoryTyping.values()) {
      clearTimeout(timeout);
    }
    this.memoryTyping.clear();
    this.memorySockets.clear();
    this.memoryPresence.clear();
  }

  // Tenant-prefixed key generator
  getKey(tenantId: string, key: string): string {
    return `${tenantId}:${key}`;
  }

  // Presence
  async setUserOnline(tenantId: string, userId: string, socketId: string): Promise<void> {
    if (this.redisClient) {
      try {
        const key = this.getKey(tenantId, `user:${userId}:sockets`);
        await this.redisClient.sadd(key, socketId);
        await this.redisClient.set(this.getKey(tenantId, `user:${userId}:status`), 'online');
        await this.redisClient.set(this.getKey(tenantId, `user:${userId}:last_seen`), Date.now().toString());
        return;
      } catch (err: any) {
        this.logger.warn(`Redis error in setUserOnline: ${err.message}`);
      }
    }

    // In-Memory Fallback
    const userKey = this.getKey(tenantId, `user:${userId}`);
    if (!this.memorySockets.has(userKey)) {
      this.memorySockets.set(userKey, new Set<string>());
    }
    this.memorySockets.get(userKey)!.add(socketId);
    this.memoryPresence.set(userKey, { status: 'online', last_seen: Date.now() });
  }

  async setUserOffline(tenantId: string, userId: string, socketId: string): Promise<boolean> {
    if (this.redisClient) {
      try {
        const key = this.getKey(tenantId, `user:${userId}:sockets`);
        await this.redisClient.srem(key, socketId);
        const remaining = await this.redisClient.scard(key);
        if (remaining === 0) {
          await this.redisClient.set(this.getKey(tenantId, `user:${userId}:status`), 'offline');
          await this.redisClient.set(this.getKey(tenantId, `user:${userId}:last_seen`), Date.now().toString());
          return true; // Completely offline
        }
        return false;
      } catch (err: any) {
        this.logger.warn(`Redis error in setUserOffline: ${err.message}`);
      }
    }

    // In-Memory Fallback
    const userKey = this.getKey(tenantId, `user:${userId}`);
    const socketSet = this.memorySockets.get(userKey);
    if (socketSet) {
      socketSet.delete(socketId);
      if (socketSet.size === 0) {
        this.memorySockets.delete(userKey);
        this.memoryPresence.set(userKey, { status: 'offline', last_seen: Date.now() });
        return true;
      }
    }
    return false;
  }

  async getUserPresence(tenantId: string, userId: string): Promise<{ status: string; last_seen?: number }> {
    if (this.redisClient) {
      try {
        const status = (await this.redisClient.get(this.getKey(tenantId, `user:${userId}:status`))) || 'offline';
        const lastSeen = await this.redisClient.get(this.getKey(tenantId, `user:${userId}:last_seen`));
        return {
          status,
          last_seen: lastSeen ? parseInt(lastSeen, 10) : undefined,
        };
      } catch {}
    }

    const userKey = this.getKey(tenantId, `user:${userId}`);
    return this.memoryPresence.get(userKey) || { status: 'offline' };
  }

  // Typing Indicators with 5-second TTL
  async setTyping(tenantId: string, conversationId: string, userId: string): Promise<void> {
    const key = this.getKey(tenantId, `typing:${conversationId}:${userId}`);

    if (this.redisClient) {
      try {
        await this.redisClient.set(key, '1', 'EX', 5);
        return;
      } catch {}
    }

    // Clear existing timer if any
    const existing = this.memoryTyping.get(key);
    if (existing) {
      clearTimeout(existing);
    }

    // Auto-expire after 5 seconds
    const timer = setTimeout(() => {
      this.memoryTyping.delete(key);
    }, 5000);
    this.memoryTyping.set(key, timer);
  }

  async clearTyping(tenantId: string, conversationId: string, userId: string): Promise<void> {
    const key = this.getKey(tenantId, `typing:${conversationId}:${userId}`);

    if (this.redisClient) {
      try {
        await this.redisClient.del(key);
        return;
      } catch {}
    }

    const timer = this.memoryTyping.get(key);
    if (timer) {
      clearTimeout(timer);
      this.memoryTyping.delete(key);
    }
  }
}
