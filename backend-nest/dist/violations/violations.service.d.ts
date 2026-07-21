import { Repository } from 'typeorm';
import { Violation } from './entities/violation.entity';
import { ViolationLink } from './entities/violation-link.entity';
import { SpService } from '../sp/sp.service';
import { CreateViolationInternalDto } from './dto/create-violation-internal.dto';
import { ViolationFilterDto } from './dto/violation-filter.dto';
import { LinkViolationDto } from './dto/link-violation.dto';
import { ViolationResponseDto } from './dto/violation-response.dto';
export declare class ViolationsService {
    private repo;
    private linkRepo;
    private spService;
    constructor(repo: Repository<Violation>, linkRepo: Repository<ViolationLink>, spService: SpService);
    static computeShift(date: Date): 'Pagi' | 'Siang' | 'Malam';
    static buildMissingList(v: Partial<Violation>): string[];
    private generateCode;
    createFromDetection(dto: CreateViolationInternalDto): Promise<Violation>;
    findAll(filter: ViolationFilterDto): Promise<[Violation[], number]>;
    findOne(id: string): Promise<Violation>;
    linkToPersonnel(violationId: string, dto: LinkViolationDto, linkedBy: string): Promise<ViolationLink[]>;
    unlinkFromPersonnel(violationId: string, personnelId: string): Promise<void>;
    getLinksForViolation(violationId: string): Promise<ViolationLink[]>;
    remove(id: string): Promise<void>;
    toResponseDto(v: Violation): ViolationResponseDto;
}
