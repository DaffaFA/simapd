import { Repository } from 'typeorm';
import { Personnel } from './entities/personnel.entity';
import { SpService } from '../sp/sp.service';
import { PersonnelFilterDto } from './dto/personnel-filter.dto';
import { CreatePersonnelDto } from './dto/create-personnel.dto';
import { UpdatePersonnelDto } from './dto/update-personnel.dto';
import { PersonnelResponseDto } from './dto/personnel-response.dto';
export declare class PersonnelService {
    private repo;
    private spService;
    constructor(repo: Repository<Personnel>, spService: SpService);
    findAll(filter: PersonnelFilterDto): Promise<[PersonnelResponseDto[], number]>;
    findOne(id: string): Promise<PersonnelResponseDto>;
    create(dto: CreatePersonnelDto): Promise<PersonnelResponseDto>;
    update(id: string, dto: UpdatePersonnelDto): Promise<PersonnelResponseDto>;
    softDelete(id: string): Promise<void>;
    private toDto;
}
