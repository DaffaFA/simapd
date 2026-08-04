import { Entity, Column, Index, ManyToOne, JoinColumn, OneToMany } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { Personnel } from '../../personnel/entities/personnel.entity';
import { ViolationLink } from './violation-link.entity';

@Entity('violations')
@Index(['detected_at'])
@Index(['personnel_id'])
@Index(['camera_id'])
export class Violation extends BaseEntity {
  @Column({ unique: true })
  violation_code: string;

  @Column()
  track_id: number;

  @Column()
  camera_id: string;

  @Column({ type: 'timestamptz' })
  detected_at: Date;

  @Column({ type: 'enum', enum: ['Pagi', 'Siang', 'Malam'] })
  shift: string;

  @Column({ type: 'enum', enum: ['Kuning', 'Putih', 'Hijau', 'Unknown'], default: 'Unknown' })
  helm_color_detected: string;

  @Column({ default: '' })
  role_detected: string;

  @Column({ default: false })
  missing_helm: boolean;

  @Column({ default: false })
  missing_vest: boolean;

  @Column({ default: false })
  missing_shoes: boolean;

  @Column({ type: 'float', default: 0 })
  confidence: number;

  @Column({ default: 0 })
  bbox_x1: number;

  @Column({ default: 0 })
  bbox_y1: number;

  @Column({ default: 0 })
  bbox_x2: number;

  @Column({ default: 0 })
  bbox_y2: number;

  @Column({ nullable: true })
  frame_path: string;

  @Column({ nullable: true })
  frame_key: string;

  @ManyToOne(() => Personnel, (p: Personnel) => p.violations, { nullable: true })
  @JoinColumn({ name: 'personnel_id' })
  personnel: Personnel;

  @OneToMany(() => ViolationLink, (l) => l.violation, { cascade: true, eager: false })
  links: ViolationLink[];

  @Column({ nullable: true })
  personnel_id: string;

  @Column({ nullable: true })
  linked_by: string;

  @Column({ type: 'timestamptz', nullable: true })
  linked_at: Date;

  @Column({ nullable: true })
  notes: string;

  // ── Status lifecycle ─────────────────────────────────────────────────────
  @Column({ type: 'varchar', length: 20, default: 'pending' })
  status: 'pending' | 'confirmed' | 'rejected';

  @Column({ type: 'varchar', nullable: true })
  rejected_by: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  rejected_at: Date | null;

  @Column({ type: 'varchar', nullable: true })
  reject_reason: string | null;
}
