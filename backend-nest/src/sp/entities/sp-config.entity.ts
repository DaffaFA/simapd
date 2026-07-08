import { Entity, Column } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';

@Entity('sp_config')
export class SpConfig extends BaseEntity {
  @Column({ default: 3 })
  sp1_threshold: number;

  @Column({ default: 7 })
  sp2_threshold: number;

  @Column({ default: 12 })
  sp3_threshold: number;

  @Column({ default: 30 })
  sp1_duration_days: number;

  @Column({ default: 60 })
  sp2_duration_days: number;

  @Column({ default: 90 })
  sp3_duration_days: number;

  @Column({ nullable: true })
  updated_by: string;

  @Column({ default: true })
  is_active: boolean;
  // SINGLETON: selalu findOne({ where: { is_active: true } })
}
