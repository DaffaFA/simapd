import { BaseEntity } from '../../common/entities/base.entity';
import { Violation } from '../../violations/entities/violation.entity';
import { SpRecord } from '../../sp/entities/sp-record.entity';
export declare class Personnel extends BaseEntity {
    employee_id: string;
    full_name: string;
    role: string;
    helm_color: string;
    department: string;
    is_active: boolean;
    notes: string;
    violations: Violation[];
    sp_records: SpRecord[];
}
