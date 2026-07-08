import { IsOptional, IsInt, Min } from 'class-validator';

export class SpConfigUpdateDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  sp1_threshold?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  sp2_threshold?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  sp3_threshold?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  sp1_duration_days?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  sp2_duration_days?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  sp3_duration_days?: number;
}
