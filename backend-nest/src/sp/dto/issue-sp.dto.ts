import { IsUUID, IsEnum, IsOptional, IsString } from 'class-validator';

export class IssueSpDto {
  @IsUUID()
  personnel_id!: string;

  @IsEnum(['SP1', 'SP2', 'SP3'])
  level!: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
