import { IsOptional, IsString, IsEnum, IsInt, Min, Max, IsBoolean, IsDateString, IsUUID } from 'class-validator';
import { Type, Transform } from 'class-transformer';

export class ViolationFilterDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  page_size?: number = 20;

  @IsOptional()
  @IsDateString()
  date_from?: string;

  @IsOptional()
  @IsDateString()
  date_to?: string;

  @IsOptional()
  @IsEnum(['Pagi', 'Siang', 'Malam'])
  shift?: string;

  @IsOptional()
  @IsString()
  camera_id?: string;

  @IsOptional()
  @IsEnum(['helm', 'vest', 'sepatu'])
  missing_ppe?: string;

  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true')
  is_linked?: boolean;

  @IsOptional()
  @IsUUID('4')
  personnel_id?: string;

  @IsOptional()
  @IsString()
  exclude_status?: string;  // e.g. 'rejected'

  @IsOptional()
  @IsString()
  status?: string;          // e.g. 'pending', 'confirmed', 'rejected'
}
