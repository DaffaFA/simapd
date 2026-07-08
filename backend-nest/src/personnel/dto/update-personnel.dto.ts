import { PartialType } from '@nestjs/mapped-types';
import { CreatePersonnelDto } from './create-personnel.dto';
import { IsOptional, IsBoolean } from 'class-validator';

export class UpdatePersonnelDto extends PartialType(CreatePersonnelDto) {
  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}
