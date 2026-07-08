import { Repository } from 'typeorm';
import { Violation } from './entities/violation.entity';
import { SpService } from '../sp/sp.service';
import { CreateViolationInternalDto } from './dto/create-violation-internal.dto';
import { ViolationFilterDto } from './dto/violation-filter.dto';
import { LinkViolationDto } from './dto/link-violation.dto';
import { ViolationResponseDto } from './dto/violation-response.dto';
export declare class ViolationsService {
    private repo;
    private spService;
    constructor(repo: Repository<Violation>, spService: SpService);
    static computeShift(date: Date): 'Pagi' | 'Siang' | 'Malam';
    static buildMissingList(v: Partial<Violation>): string[];
    private generateCode;
    createFromDetection(dto: CreateViolationInternalDto): Promise<Violation>;
    findAll(filter: ViolationFilterDto): Promise<[Violation[], number]>;
    findOne(id: string): Promise<Violation>;
    linkToPersonnel(id: string, dto: LinkViolationDto, linkedBy: string): Promise<Violation>;
    unlinkPersonnel(id: string): Promise<Violation>;
    remove(id: string): Promise<void>;
    toResponseDto(v: Violation): ViolationResponseDto;
}
