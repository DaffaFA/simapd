import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Redis } from 'ioredis';

@Injectable()
export class RedisService implements OnModuleDestroy {
  private readonly sub: Redis;
  private readonly pub: Redis;

  constructor(private cfg: ConfigService) {
    const url = cfg.get<string>('redis.url') || 'redis://localhost:6379';
    const opts = { retryStrategy: (t: number) => Math.min(t * 200, 3000) };
    this.sub = new Redis(url, opts);
    this.pub = new Redis(url, opts);
  }

  async subscribe(channel: string, handler: (msg: string) => void): Promise<void> {
    await this.sub.subscribe(channel);
    this.sub.on('message', (ch, msg) => {
      if (ch === channel) handler(msg);
    });
  }

  async publish(channel: string, data: object): Promise<void> {
    await this.pub.publish(channel, JSON.stringify(data)).catch(console.error);
  }

  async onModuleDestroy() {
    await Promise.all([this.sub.quit(), this.pub.quit()]);
  }
}
