import { Injectable, OnApplicationBootstrap, Logger, Inject, forwardRef } from '@nestjs/common';
import { RedisService } from '../redis/redis.service';
import { ViolationsService } from '../violations/violations.service';
import { StreamGateway } from './stream.gateway';
import { DetectionMessage, FrameMessage } from '../common/types/detection.types';

@Injectable()
export class StreamService implements OnApplicationBootstrap {
  private readonly logger = new Logger(StreamService.name);
  private cooldown = new Map<number, number>(); // track_id → last_violation_timestamp_ms
  private readonly COOLDOWN_MS = 30_000;

  constructor(
    private redis: RedisService,
    private violations: ViolationsService,
    @Inject(forwardRef(() => StreamGateway)) private gateway: StreamGateway,
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
    let msg: DetectionMessage;
    try {
      msg = JSON.parse(raw);
    } catch {
      return;
    }

    // Broadcast semua detections (compliant + non-compliant) ke WS clients
    this.gateway.broadcast(msg);

    if (!msg.is_compliant) {
      const now = Date.now();
      if (now - (this.cooldown.get(msg.track_id) ?? 0) < this.COOLDOWN_MS) return;
      this.cooldown.set(msg.track_id, now);

      try {
        const v = await this.violations.createFromDetection({
          track_id: msg.track_id,
          camera_id: msg.camera_id,
          detected_at: new Date(msg.timestamp),
          helm_color_detected: msg.helm_color,
          role_detected: msg.role_label,
          missing_helm: msg.missing_ppe.includes('helm'),
          missing_vest: msg.missing_ppe.includes('vest'),
          missing_shoes: msg.missing_ppe.includes('sepatu'),
          confidence: msg.confidence,
          bbox_x1: msg.bbox[0],
          bbox_y1: msg.bbox[1],
          bbox_x2: msg.bbox[2],
          bbox_y2: msg.bbox[3],
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
          timestamp: msg.timestamp,
        });
      } catch (e) {
        this.logger.error('Save violation failed:', e);
      }

      // Cleanup cooldown map
      if (this.cooldown.size > 1000) {
        const cutoff = Date.now() - this.COOLDOWN_MS;
        this.cooldown.forEach((t, k) => {
          if (t < cutoff) this.cooldown.delete(k);
        });
      }
    }
  }

  private onHeartbeat(raw: string) {
    try {
      this.gateway.broadcast({ event: 'camera_heartbeat', ...JSON.parse(raw) });
    } catch {}
  }
}
