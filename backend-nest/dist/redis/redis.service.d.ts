import { OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
export declare class RedisService implements OnModuleDestroy {
    private cfg;
    private readonly sub;
    private readonly pub;
    constructor(cfg: ConfigService);
    subscribe(channel: string, handler: (msg: string) => void): Promise<void>;
    publish(channel: string, data: object): Promise<void>;
    onModuleDestroy(): Promise<void>;
}
