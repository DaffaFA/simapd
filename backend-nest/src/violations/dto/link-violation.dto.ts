import { IsUUID, IsOptional, IsString, IsArray, ArrayMinSize, ArrayMaxSize, MaxLength } from 'class-validator';

export class LinkViolationDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(10)
  @IsUUID('4', { each: true })
  personnel_ids!: string[];

  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}
