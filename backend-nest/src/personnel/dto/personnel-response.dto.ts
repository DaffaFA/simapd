import { Personnel } from '../entities/personnel.entity';

export class PersonnelResponseDto {
  id!: string;
  employee_id!: string;
  full_name!: string;
  role!: string;
  helm_color!: string;
  department!: string;
  is_active!: boolean;
  notes?: string;
  created_at!: Date;
  updated_at!: Date;
  violation_count!: number;
  active_sp!: string | null;
  cooldown_until!: Date | null;
}
