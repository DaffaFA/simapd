import { Entity, Column, Index, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { Personnel } from '../../personnel/entities/personnel.entity';

@Entity('sp_records')
@Index(['personnel_id', 'is_active'])
export class SpRecord extends BaseEntity {
  @Column({ unique: true })
  sp_number: string;

  @ManyToOne(() => Personnel, (p) => p.sp_records)
  @JoinColumn({ name: 'personnel_id' })
  personnel: Personnel;

  @Column()
  personnel_id: string;

  @Column({ type: 'enum', enum: ['SP1', 'SP2', 'SP3'] })
  level: string;

  @Column({ type: 'timestamptz' })
  issued_at: Date;

  @Column({ type: 'timestamptz' })
  expires_at: Date;

  @Column({ default: true })
  is_active: boolean;

  @Column()
  violation_count_at_issuance: number;

  @Column({ nullable: true })
  issued_by: string;

  @Column({ type: 'timestamptz', nullable: true })
  revoked_at: Date;

  @Column({ nullable: true })
  revoked_by: string;

  @Column({ nullable: true })
  notes: string;

  @Column({ nullable: true })
  trigger_violation_id: string;
}
