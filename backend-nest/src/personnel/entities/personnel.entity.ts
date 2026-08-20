import { Entity, Column, Index, OneToMany } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { Violation } from '../../violations/entities/violation.entity';
import { SpRecord } from '../../sp/entities/sp-record.entity';

@Entity('personnel')
@Index(['is_active'])
export class Personnel extends BaseEntity {
  @Column({ unique: true })
  employee_id: string;

  @Column()
  full_name: string;

  @Column({ type: 'enum', enum: ['Pekerja', 'Supervisor', 'Safety Officer'] })
  role: string;

  @Column({ type: 'enum', enum: ['Kuning', 'Putih', 'Hijau'] })
  helm_color: string;

  @Column()
  department: string;

  @Column({ type: 'varchar', nullable: true })
  email: string | null;

  @Column({ default: true })
  is_active: boolean;

  @Column({ nullable: true })
  notes: string;

  @OneToMany(() => Violation, (v: Violation) => v.personnel)
  violations: Violation[];

  @OneToMany(() => SpRecord, (sp: SpRecord) => sp.personnel)
  sp_records: SpRecord[];
}
