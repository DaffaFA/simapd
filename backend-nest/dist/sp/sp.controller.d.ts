import { SpService } from './sp.service';
import { IssueSpDto } from './dto/issue-sp.dto';
import { SpConfigUpdateDto } from './dto/sp-config-update.dto';
import { User } from '../auth/entities/user.entity';
import { PaginatedResponseDto } from '../common/dto/paginated-response.dto';
export declare class SpController {
    private readonly spService;
    constructor(spService: SpService);
    issue(dto: IssueSpDto, user: User): Promise<import("./entities/sp-record.entity").SpRecord>;
    revoke(id: string, user: User): Promise<import("./entities/sp-record.entity").SpRecord>;
    getConfig(): Promise<import("./entities/sp-config.entity").SpConfig>;
    updateConfig(dto: SpConfigUpdateDto, user: User): Promise<import("./entities/sp-config.entity").SpConfig>;
    getActive(page?: string, pageSize?: string): Promise<PaginatedResponseDto<import("./entities/sp-record.entity").SpRecord>>;
}
