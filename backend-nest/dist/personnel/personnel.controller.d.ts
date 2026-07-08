import { PersonnelService } from './personnel.service';
import { PersonnelFilterDto } from './dto/personnel-filter.dto';
import { CreatePersonnelDto } from './dto/create-personnel.dto';
import { UpdatePersonnelDto } from './dto/update-personnel.dto';
import { PaginatedResponseDto } from '../common/dto/paginated-response.dto';
import { PersonnelResponseDto } from './dto/personnel-response.dto';
export declare class PersonnelController {
    private readonly service;
    constructor(service: PersonnelService);
    findAll(q: PersonnelFilterDto): Promise<PaginatedResponseDto<PersonnelResponseDto>>;
    findOne(id: string): Promise<PersonnelResponseDto>;
    create(dto: CreatePersonnelDto): Promise<PersonnelResponseDto>;
    update(id: string, dto: UpdatePersonnelDto): Promise<PersonnelResponseDto>;
    remove(id: string): Promise<void>;
}
