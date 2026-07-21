import { OnApplicationBootstrap } from '@nestjs/common';
import { RedisService } from '../redis/redis.service';
import { ViolationsService } from '../violations/violations.service';
import { StreamGateway } from './stream.gateway';
export declare class StreamService implements OnApplicationBootstrap {
    private redis;
    private violations;
    private gateway;
    private readonly logger;
    private cooldown;
    private readonly COOLDOWN_MS;
    constructor(redis: RedisService, violations: ViolationsService, gateway: StreamGateway);
    onApplicationBootstrap(): Promise<void>;
    private onFrame;
    private onDetection;
    private onHeartbeat;
}
