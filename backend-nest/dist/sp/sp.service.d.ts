import { Repository } from 'typeorm';
import { SpRecord } from './entities/sp-record.entity';
import { SpConfig } from './entities/sp-config.entity';
import { IssueSpDto } from './dto/issue-sp.dto';
import { SpConfigUpdateDto } from './dto/sp-config-update.dto';
export declare class SpService {
    private spRepo;
    private cfgRepo;
    constructor(spRepo: Repository<SpRecord>, cfgRepo: Repository<SpConfig>);
    getActiveSp(personnelId: string): Promise<SpRecord | null>;
    checkAndAutoIssueSp(personnelId: string, issuedBy: string, triggerViolationId?: string): Promise<SpRecord | null>;
    private computeRequiredLevel;
    issueManual(dto: IssueSpDto, issuedBy: string): Promise<SpRecord>;
    revoke(spId: string, revokedBy: string): Promise<SpRecord>;
    getConfig(): Promise<SpConfig>;
    updateConfig(dto: SpConfigUpdateDto, updatedBy: string): Promise<SpConfig>;
    findActiveAll(page: number, pageSize: number): Promise<[SpRecord[], number]>;
    findAll(personnelId?: string): Promise<SpRecord[]>;
    expireOutdated(): Promise<number>;
}
