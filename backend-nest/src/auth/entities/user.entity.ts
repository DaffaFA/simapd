import { Entity, Column } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';

@Entity('users')
export class User extends BaseEntity {
  @Column({ unique: true })
  username: string;

  @Column({ unique: true })
  email: string;

  @Column()
  hashed_password: string;

  @Column({ nullable: true })
  full_name: string;

  @Column({ type: 'enum', enum: ['safety_officer', 'supervisor', 'admin'], default: 'safety_officer' })
  role: string;

  @Column({ default: true })
  is_active: boolean;

  @Column({ type: 'timestamptz', nullable: true })
  last_login: Date;

  // Tanda tangan digital (data URI base64), dilampirkan ke PDF Surat Peringatan.
  @Column({ type: 'text', nullable: true })
  signature: string | null;
}
