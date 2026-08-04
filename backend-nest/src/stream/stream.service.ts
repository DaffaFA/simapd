import { Injectable, OnApplicationBootstrap, Logger, Inject, forwardRef } from '@nestjs/common';
import { RedisService } from '../redis/redis.service';
import { ViolationsService } from '../violations/violations.service';
import { StreamGateway } from './stream.gateway';
import { NotificationsService } from '../notifications/notifications.service';
import { FrameMessage } from '../common/types/detection.types';

@Injectable()
export class StreamService implements OnApplicationBootstrap {
  private readonly logger = new Logger(StreamService.name);
  private pendingBatch = new Map<string, { count: number; missing: Set<string> }>();
  private batchTimer?:  ReturnType<typeof setTimeout>;

  constructor(
    private redis: RedisService,
    private violations: ViolationsService,
    @Inject(forwardRef(() => StreamGateway)) private gateway: StreamGateway,
    @Inject(forwardRef(() => NotificationsService)) private notifications: NotificationsService,
  ) {}

  async onApplicationBootstrap() {
    await this.redis.subscribe('detections', raw => this.onDetection(raw));
    await this.redis.subscribe('heartbeat', raw => this.onHeartbeat(raw));
    await this.redis.subscribe('frames', raw => this.onFrame(raw));
    this.logger.log('Subscribed: detections, heartbeat, frames');
  }

  private onFrame(raw: string) {
    try {
      const msg: FrameMessage = JSON.parse(raw);
      this.gateway.broadcast(msg);
    } catch {
      // ignore parse errors
    }
  }

  private async onDetection(raw: string) {
    let msg: any;
    try {
      msg = JSON.parse(raw);
    } catch {
      return;
    }

    // Broadcast semua detections (compliant + non-compliant) ke WS clients
    this.gateway.broadcast(msg);

    // Hanya buat DB violation record jika event type = 'violation'
    // Event type 'detection' hanya untuk live display — JANGAN simpan ke DB
    if (msg.event === 'violation') {
      try {
        const v = await this.violations.createFromDetection({
          track_id: msg.track_id,
          camera_id: msg.camera_id,
          detected_at: new Date(msg.timestamp),
          helm_color_detected: msg.helm_color,
          role_detected: msg.role_label,
          missing_helm: (msg.missing_ppe ?? []).includes('helm'),
          missing_vest: (msg.missing_ppe ?? []).includes('vest'),
          missing_shoes: (msg.missing_ppe ?? []).includes('sepatu'),
          confidence: msg.confidence,
          bbox_x1: msg.bbox?.[0],
          bbox_y1: msg.bbox?.[1],
          bbox_x2: msg.bbox?.[2],
          bbox_y2: msg.bbox?.[3],
          frame_path: msg.frame_path ?? undefined,
          frame_key: msg.frame_key ?? undefined,
        });

        this.gateway.broadcast({
          event: 'violation_alert',
          violation_id: v.id,
          violation_code: v.violation_code,
          track_id: msg.track_id,
          camera_id: msg.camera_id,
          role_label: msg.role_label,
          missing_ppe: msg.missing_ppe,
          frame_key: msg.frame_key,
          timestamp: msg.timestamp,
        });

        const batchKey = msg.camera_id;
        const existing = this.pendingBatch.get(batchKey) ?? { count: 0, missing: new Set<string>() };
        existing.count++;
        (msg.missing_ppe ?? []).forEach((p: string) => existing.missing.add(p));
        this.pendingBatch.set(batchKey, existing);

        clearTimeout(this.batchTimer);
        this.batchTimer = setTimeout(async () => {
          for (const [cameraId, batch] of this.pendingBatch.entries()) {
            await this.notifications.sendViolationNotification({
              camera_id:   cameraId,
              count:       batch.count,
              missing_ppe: Array.from(batch.missing),
            });
          }
          this.pendingBatch.clear();
        }, 5000);

        this.logger.log(
          `Violation saved: ${v.violation_code} | ` +
          `camera=${msg.camera_id} track=${msg.track_id} | ` +
          `frame_key=${msg.frame_key ?? 'null'}`
        );
      } catch (e) {
        this.logger.error(`Save violation failed: ${(e as Error).message}`);
      }
    }
  }

  private onHeartbeat(raw: string) {
    try {
      this.gateway.broadcast({ event: 'camera_heartbeat', ...JSON.parse(raw) });
    } catch {}
  }
}
