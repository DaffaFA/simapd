import { BaseEntity } from '../../common/entities/base.entity';
import { Personnel } from '../../personnel/entities/personnel.entity';
export declare class SpRecord extends BaseEntity {
    sp_number: string;
    personnel: Personnel;
    personnel_id: string;
    level: string;
    issued_at: Date;
    expires_at: Date;
    is_active: boolean;
    violation_count_at_issuance: number;
    issued_by: string;
    revoked_at: Date;
    revoked_by: string;
    notes: string;
    trigger_violation_id: string;
}
