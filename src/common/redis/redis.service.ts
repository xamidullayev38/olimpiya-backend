import { Injectable, OnModuleDestroy, OnModuleInit, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private client: Redis | null = null;
  private isConnected = false;

  constructor(private configService: ConfigService) {}

  onModuleInit() {
    const redisUrl = this.configService.get<string>('REDIS_URL') || 'redis://localhost:6379';

    this.client = new Redis(redisUrl, {
      lazyConnect: true,
      maxRetriesPerRequest: 3,
      retryStrategy: (times) => {
        const delay = Math.min(times * 100, 3000);
        this.logger.warn(`Redis qayta ulanish urinishi #${times}, keyingi urinish ${delay}ms dan so'ng`);
        return delay;
      },
    });

    this.client.on('connect', () => {
      this.isConnected = true;
      this.logger.log('Redis serverga muvaffaqiyatli ulandi');
    });

    this.client.on('error', (err) => {
      this.isConnected = false;
      this.logger.error(`Redis ulanish xatosi: ${err.message}`);
    });

    this.client.connect().catch((err) => {
      this.logger.warn(`Redis ga ulanib bo'lmadi (kosh ishlamasligi mumkin): ${err.message}`);
    });
  }

  onModuleDestroy() {
    if (this.client) {
      this.client.disconnect();
    }
  }

  get isReady(): boolean {
    return this.isConnected && this.client?.status === 'ready';
  }

  async get<T>(key: string): Promise<T | null> {
    if (!this.isReady || !this.client) return null;
    try {
      const value = await this.client.get(key);
      return value ? JSON.parse(value) : null;
    } catch (e: any) {
      this.logger.error(`Redis GET (${key}) xatosi: ${e.message}`);
      return null;
    }
  }

  async set(key: string, value: any, ttlSeconds: number = 300): Promise<boolean> {
    if (!this.isReady || !this.client) return false;
    try {
      const serialized = JSON.stringify(value);
      await this.client.set(key, serialized, 'EX', ttlSeconds);
      return true;
    } catch (e: any) {
      this.logger.error(`Redis SET (${key}) xatosi: ${e.message}`);
      return false;
    }
  }

  async del(key: string): Promise<boolean> {
    if (!this.isReady || !this.client) return false;
    try {
      await this.client.del(key);
      return true;
    } catch (e: any) {
      this.logger.error(`Redis DEL (${key}) xatosi: ${e.message}`);
      return false;
    }
  }

  async delByPattern(pattern: string): Promise<boolean> {
    if (!this.isReady || !this.client) return false;
    try {
      const keys = await this.client.keys(pattern);
      if (keys.length > 0) {
        await this.client.del(...keys);
      }
      return true;
    } catch (e: any) {
      this.logger.error(`Redis DEL PATTERN (${pattern}) xatosi: ${e.message}`);
      return false;
    }
  }
}
