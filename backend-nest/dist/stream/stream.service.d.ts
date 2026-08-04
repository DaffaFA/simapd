import { OnApplicationBootstrap } from '@nestjs/common';
import { RedisService } from '../redis/redis.service';
import { ViolationsService } from '../violations/violations.service';
import { StreamGateway } from './stream.gateway';
import { NotificationsService } from '../notifications/notifications.service';
export declare class StreamService implements OnApplicationBootstrap {
    private redis;
    private violations;
    private gateway;
    private notifications;
    private readonly logger;
    private pendingBatch;
    private batchTimer?;
    constructor(redis: RedisService, violations: ViolationsService, gateway: StreamGateway, notifications: NotificationsService);
    onApplicationBootstrap(): Promise<void>;
    private onFrame;
    private onDetection;
    private onHeartbeat;
}
