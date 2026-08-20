import { IsString, IsNotEmpty, IsEnum, IsOptional, IsEmail } from 'class-validator';

export class CreatePersonnelDto {
  @IsString()
  @IsNotEmpty()
  employee_id!: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsString()
  @IsNotEmpty()
  full_name!: string;

  @IsEnum(['Pekerja', 'Supervisor', 'Safety Officer'])
  role!: string;

  @IsEnum(['Kuning', 'Putih', 'Hijau'])
  helm_color!: string;

  @IsString()
  @IsNotEmpty()
  department!: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
