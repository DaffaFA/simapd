export declare class ViolationResponseDto {
    id: string;
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
    missing_ppe_list: string[];
    confidence: number;
    bbox: [number, number, number, number];
    frame_path: string | null;
    personnel_id: string | null;
    personnel_name: string | null;
    linked_at: Date | null;
}
