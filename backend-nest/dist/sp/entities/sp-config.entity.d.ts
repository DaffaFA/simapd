import { BaseEntity } from '../../common/entities/base.entity';
export declare class SpConfig extends BaseEntity {
    sp1_threshold: number;
    sp2_threshold: number;
    sp3_threshold: number;
    sp1_duration_days: number;
    sp2_duration_days: number;
    sp3_duration_days: number;
    updated_by: string;
    is_active: boolean;
}
