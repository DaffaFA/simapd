import { Entity, Column, Index } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';

/**
 * Agregat harian per kamera dari SEMUA deteksi (compliant + violation) yang
 * dikirim ai-service lewat channel Redis 'detections'. Baris individual
 * deteksi tidak disimpan (volume terlalu tinggi) — hanya counter yang
 * di-upsert secara periodik oleh StreamService, dipakai AnalyticsService
 * untuk menghitung compliance_rate riil (bukan estimasi).
 */
@Entity('detection_stats')
@Index(['date', 'camera_id'], { unique: true })
export class DetectionStat extends BaseEntity {
  @Column({ type: 'date' })
  date: string;

  @Column()
  camera_id: string;

  @Column({ type: 'int', default: 0 })
  total_count: number;

  @Column({ type: 'int', default: 0 })
  violation_count: number;
}
