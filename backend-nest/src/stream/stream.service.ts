import { Injectable, OnApplicationBootstrap, Logger, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RedisService } from '../redis/redis.service';
import { ViolationsService } from '../violations/violations.service';
import { StreamGateway } from './stream.gateway';
import { NotificationsService } from '../notifications/notifications.service';
import { FrameMessage } from '../common/types/detection.types';
import { DetectionStat } from '../analytics/entities/detection-stat.entity';

interface DetectionCounter { date: string; camera_id: string; total: number; violations: number }

@Injectable()
export class StreamService implements OnApplicationBootstrap {
  private readonly logger = new Logger(StreamService.name);
  private pendingBatch = new Map<string, { count: number; missing: Set<string> }>();
  private batchTimer?:  ReturnType<typeof setTimeout>;

  // Counter deteksi (compliant + violation) per hari(UTC)+kamera, di-flush
  // berkala ke tabel detection_stats — dipakai AnalyticsService untuk
  // menghitung compliance_rate riil. Di-agregasi di memori dulu karena
  // event 'detection' datang per-orang per-frame (frekuensi tinggi),
  // menulis satu UPDATE per event akan membebani DB.
  private detectionCounters = new Map<string, DetectionCounter>();
  private readonly STATS_FLUSH_INTERVAL_MS = 15_000;

  constructor(
    private redis: RedisService,
    private violations: ViolationsService,
    @Inject(forwardRef(() => StreamGateway)) private gateway: StreamGateway,
    @Inject(forwardRef(() => NotificationsService)) private notifications: NotificationsService,
    @InjectRepository(DetectionStat) private detectionStats: Repository<DetectionStat>,
  ) {}

  async onApplicationBootstrap() {
    await this.redis.subscribe('detections', raw => this.onDetection(raw));
    await this.redis.subscribe('heartbeat', raw => this.onHeartbeat(raw));
    await this.redis.subscribe('frames', raw => this.onFrame(raw));
    setInterval(() => this.flushDetectionStats(), this.STATS_FLUSH_INTERVAL_MS);
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

    // Event 'detection' dikirim SEKALI per orang per frame (termasuk yang
    // non-compliant) — dipakai sebagai denominator riil untuk compliance
    // rate. Event 'violation' adalah sinyal terpisah (dedup per track_id)
    // untuk menyimpan record resmi, BUKAN deteksi tambahan — jangan dihitung
    // dua kali di sini.
    if (msg.event === 'detection') {
      this.recordDetection(msg);
    }

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

  private recordDetection(msg: any) {
    const cameraId = msg.camera_id;
    if (!cameraId) return;

    const ts = msg.timestamp ? new Date(msg.timestamp) : new Date();
    const date = ts.toISOString().slice(0, 10); // hari kalender UTC
    const key = `${date}|${cameraId}`;

    const entry = this.detectionCounters.get(key) ?? { date, camera_id: cameraId, total: 0, violations: 0 };
    entry.total++;
    if (msg.is_compliant === false) entry.violations++;
    this.detectionCounters.set(key, entry);
  }

  private async flushDetectionStats() {
    if (this.detectionCounters.size === 0) return;
    const batch = Array.from(this.detectionCounters.values());
    this.detectionCounters.clear();

    for (const entry of batch) {
      try {
        await this.detectionStats.query(
          `INSERT INTO detection_stats (id, date, camera_id, total_count, violation_count, created_at, updated_at)
           VALUES (uuid_generate_v4(), $1, $2, $3, $4, now(), now())
           ON CONFLICT (date, camera_id)
           DO UPDATE SET total_count = detection_stats.total_count + EXCLUDED.total_count,
                         violation_count = detection_stats.violation_count + EXCLUDED.violation_count,
                         updated_at = now()`,
          [entry.date, entry.camera_id, entry.total, entry.violations],
        );
      } catch (e) {
        this.logger.error(`Flush detection stats failed (${entry.camera_id}): ${(e as Error).message}`);
      }
    }
  }
}
