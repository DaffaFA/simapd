import { PartialType } from '@nestjs/mapped-types';
import { CreateSpDto } from './create-sp.dto';

export class UpdateSpDto extends PartialType(CreateSpDto) {}
