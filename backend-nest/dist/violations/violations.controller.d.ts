import { Response } from 'express';
import { ViolationsService } from './violations.service';
import { StorageService } from '../storage/storage.service';
import { User } from '../auth/entities/user.entity';
import { ViolationFilterDto } from './dto/violation-filter.dto';
import { LinkViolationDto } from './dto/link-violation.dto';
import { ViolationResponseDto } from './dto/violation-response.dto';
import { PaginatedResponseDto } from '../common/dto/paginated-response.dto';
export declare class ViolationsController {
    private readonly service;
    private readonly storage;
    constructor(service: ViolationsService, storage: StorageService);
    findAll(f: ViolationFilterDto): Promise<PaginatedResponseDto<ViolationResponseDto>>;
    findOne(id: string): Promise<ViolationResponseDto>;
    linkToPersonnel(id: string, dto: LinkViolationDto, user: User): Promise<{
        message: string;
        linked: {
            id: string;
            personnel_id: string;
            linked_by: string;
            linked_at: Date;
        }[];
    }>;
    getViolationLinks(id: string): Promise<{
        id: string;
        personnel_id: string;
        personnel: {
            id: string;
            employee_id: string;
            full_name: string;
            role: string;
            department: string;
        } | null;
        linked_by: string;
        linked_at: Date;
        notes: string;
    }[]>;
    unlinkFromPersonnel(id: string, personnelId: string): Promise<{
        message: string;
    }>;
    getViolationFrame(id: string, res: Response): Promise<void>;
    remove(id: string): Promise<void>;
}
