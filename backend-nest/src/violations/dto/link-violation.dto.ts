import { IsUUID, IsOptional, IsString } from 'class-validator';

export class LinkViolationDto {
  @IsUUID()
  personnel_id!: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
