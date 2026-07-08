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
}
