import { Entity, Column } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';

@Entity('cameras')
export class Camera extends BaseEntity {
  @Column({ unique: true })
  camera_id: string;

  @Column()
  name: string;

  @Column()
  zone: string;

  @Column({ nullable: true })
  rtsp_url: string;

  @Column({ default: true })
  is_active: boolean;

  @Column({ nullable: true })
  description: string;
}
