export interface DetectionMessage {
    event: 'detection';
    track_id: number;
    role_label: string;
    helm_color: 'Kuning' | 'Putih' | 'Hijau' | 'Unknown';
    missing_ppe: ('helm' | 'vest' | 'sepatu')[];
    missing_helm: boolean;
    missing_vest: boolean;
    missing_shoes: boolean;
    is_compliant: boolean;
    timestamp: string;
    bbox: [number, number, number, number];
    camera_id: string;
    confidence: number;
    frame_path?: string | null;
    frame_key?: string | null;
}
export interface FrameMessage {
    event: 'frame';
    camera_id: string;
    frame_b64: string;
    width: number;
    height: number;
    detections: FrameDetection[];
    timestamp: string;
}
export interface FrameDetection {
    track_id: number;
    bbox: [number, number, number, number];
    helm_color: string;
    role_label: string;
    is_compliant: boolean;
    missing_ppe: string[];
    confidence?: number;
}
