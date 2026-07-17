import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import Redis from 'ioredis';

// A connected client, ready for Phase 1 to use as the session store
// (e.g. via connect-redis) once Passport sessions are wired up.
@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  readonly client = new Redis(
    process.env['REDIS_URL'] ?? 'redis://localhost:6379',
    { lazyConnect: true },
  );

  async onModuleInit(): Promise<void> {
    await this.client.connect();
    this.logger.log('Connected to Redis');
  }

  onModuleDestroy(): void {
    this.client.disconnect();
  }
}
