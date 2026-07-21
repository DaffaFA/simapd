import { BaseEntity } from 'typeorm';
import { Violation } from './violation.entity';
import { Personnel } from '../../personnel/entities/personnel.entity';
export declare class ViolationLink extends BaseEntity {
    id: string;
    violation_id: string;
    violation: Violation;
    personnel_id: string;
    personnel: Personnel;
    linked_by: string;
    linked_at: Date;
    notes: string;
    created_at: Date;
    updated_at: Date;
}
