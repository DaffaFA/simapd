// Sync dengan NestJS DTOs — update bila DTO berubah

export type HelmColor   = 'Kuning' | 'Putih' | 'Hijau' | 'Unknown'
export type PersonRole  = 'Pekerja' | 'Supervisor' | 'Safety Officer'
export type SPLevel     = 'SP1' | 'SP2' | 'SP3'
export type Shift       = 'Pagi' | 'Siang' | 'Malam'
export type PPEItem     = 'helm' | 'vest' | 'sepatu'

// Auth role — sync dengan enum di backend-nest/src/users/entities/user.entity.ts
export type Role = 'safety_officer' | 'supervisor' | 'admin'

export interface User { id: string; username: string; full_name: string; role: Role }
export interface TokenResponse { access_token: string; token_type: string; user: User }

export interface Personnel {
  id: string; employee_id: string; full_name: string
  role: PersonRole; helm_color: HelmColor; department: string
  is_active: boolean; notes: string | null
  violation_count: number; active_sp: SPLevel | null; created_at: string
  updated_at?: string;
}

export interface UpdatePersonnelDto {
  full_name?:   string
  role?:        string
  helm_color?:  string
  department?:  string
  is_active?:   boolean
}

export interface Violation {
  id: string; violation_code: string; track_id: number; camera_id: string
  detected_at: string; shift: Shift; helm_color_detected: HelmColor
  role_detected: string; missing_helm: boolean; missing_vest: boolean
  missing_shoes: boolean; missing_ppe_list: PPEItem[]; confidence: number
  bbox: [number, number, number, number]; frame_path: string | null
  personnel_id: string | null; personnel_name: string | null; linked_at: string | null
  created_at?: string
}

export interface SpRecord {
  id: string; sp_number: string; personnel_id: string
  level: SPLevel; issued_at: string; expires_at: string; is_active: boolean
  violation_count_at_issuance: number
}

export interface PaginatedResponse<T> {
  items: T[]; total: number; page: number; page_size: number; total_pages: number
}

export interface ComplianceSummary {
  compliance_rate: number; total_violations_today: number; total_violations_week: number
  linked_count: number; unlinked_count: number
  active_sp_count: number; sp1_count: number; sp2_count: number; sp3_count: number
}

export interface DailyTrend { date: string; total_violations: number; compliance_rate: number }

// WebSocket message types
export type WSMessage = DetectionMsg | ViolationAlertMsg | SystemMsg | HeartbeatMsg

export interface DetectionMsg {
  event: 'detection'; track_id: number; role_label: string; helm_color: HelmColor
  missing_ppe: PPEItem[]; is_compliant: boolean; timestamp: string
  bbox: [number, number, number, number]; camera_id: string; confidence: number
}

export interface ViolationAlertMsg {
  event: 'violation_alert'; violation_id: string; violation_code: string
  track_id: number; camera_id: string; role_label: string
  missing_ppe: PPEItem[]; timestamp: string
}

export interface SystemMsg  { event: 'system'; message: string; level: 'info'|'warning'|'error' }
export interface HeartbeatMsg { event: 'camera_heartbeat'; camera_id: string; fps: number; timestamp: string }
