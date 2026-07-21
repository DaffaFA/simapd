import { IsUUID } from 'class-validator';

export class UnlinkViolationDto {
  @IsUUID('4')
  personnel_id: string;
}
