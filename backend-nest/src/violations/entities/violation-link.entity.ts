import { Entity, Column, ManyToOne, JoinColumn, BaseEntity, Index, Unique, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { Violation } from './violation.entity';
import { Personnel } from '../../personnel/entities/personnel.entity';

@Entity('violation_links')
@Index(['violation_id'])
@Index(['personnel_id'])
@Unique(['violation_id', 'personnel_id'])
export class ViolationLink extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  violation_id: string;

  @ManyToOne(() => Violation, (v) => v.links)
  @JoinColumn({ name: 'violation_id' })
  violation: Violation;

  @Column()
  personnel_id: string;

  @ManyToOne(() => Personnel)
  @JoinColumn({ name: 'personnel_id' })
  personnel: Personnel;

  @Column({ nullable: true })
  linked_by: string;

  @Column({ type: 'timestamptz', default: () => 'NOW()' })
  linked_at: Date;

  @Column({ nullable: true })
  notes: string;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at: Date;
}
