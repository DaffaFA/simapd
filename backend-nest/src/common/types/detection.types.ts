export interface DetectionMessage {
  event:        'detection';
  track_id:     number;
  role_label:   string;
  helm_color:   'Kuning' | 'Putih' | 'Hijau' | 'Unknown';
  missing_ppe:  ('helm' | 'vest' | 'sepatu')[];
  missing_helm: boolean;
  missing_vest: boolean;
  missing_shoes: boolean;
  is_compliant: boolean;
  timestamp:    string;   // ISO 8601
  bbox:         [number, number, number, number];
  camera_id:    string;
  confidence:   number;
  frame_path?:  string | null;
  frame_key?:   string | null;
}

export interface FrameMessage {
  event:      'frame'
  camera_id:  string
  frame_b64:  string          // JPEG base64
  width:      number          // frame width (854)
  height:     number          // frame height (480 ish)
  detections: FrameDetection[]
  timestamp:  string
}

export interface FrameDetection {
  track_id:    number
  bbox:        [number, number, number, number]  // [x1,y1,x2,y2] scaled to frame
  helm_color:  string
  role_label:  string
  is_compliant: boolean
  missing_ppe: string[]
  confidence?: number
}
