import { BaseEntity } from '../../common/entities/base.entity';
import { Personnel } from '../../personnel/entities/personnel.entity';
import { ViolationLink } from './violation-link.entity';
export declare class Violation extends BaseEntity {
    violation_code: string;
    track_id: number;
    camera_id: string;
    detected_at: Date;
    shift: string;
    helm_color_detected: string;
    role_detected: string;
    missing_helm: boolean;
    missing_vest: boolean;
    missing_shoes: boolean;
    confidence: number;
    bbox_x1: number;
    bbox_y1: number;
    bbox_x2: number;
    bbox_y2: number;
    frame_path: string;
    frame_key: string;
    personnel: Personnel;
    links: ViolationLink[];
    personnel_id: string;
    linked_by: string;
    linked_at: Date;
    notes: string;
}
