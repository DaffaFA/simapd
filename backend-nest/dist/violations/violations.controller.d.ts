import { Response } from 'express';
import { ViolationsService } from './violations.service';
import { User } from '../auth/entities/user.entity';
import { ViolationFilterDto } from './dto/violation-filter.dto';
import { LinkViolationDto } from './dto/link-violation.dto';
import { ViolationResponseDto } from './dto/violation-response.dto';
import { PaginatedResponseDto } from '../common/dto/paginated-response.dto';
export declare class ViolationsController {
    private readonly service;
    constructor(service: ViolationsService);
    findAll(f: ViolationFilterDto): Promise<PaginatedResponseDto<ViolationResponseDto>>;
    findOne(id: string): Promise<ViolationResponseDto>;
    link(id: string, dto: LinkViolationDto, user: User): Promise<ViolationResponseDto>;
    unlink(id: string): Promise<ViolationResponseDto>;
    getFrame(id: string, res: Response): Promise<void>;
    remove(id: string): Promise<void>;
}
