import type { Violation as ApiViolation, Personnel as ApiPersonnel } from '../types/simapd';
import type { Violation as UIViolation, Personnel as UIPersonnel, HelmColor } from '../../components/shared/types';

const helmColorMap: Record<string, HelmColor> = {
  'Kuning': 'yellow',
  'Putih': 'white',
  'Hijau': 'green',
};

const apdLabelMap: Record<string, 'Helm' | 'Rompi' | 'Sepatu'> = {
  'helm': 'Helm',
  'vest': 'Rompi',
  'sepatu': 'Sepatu',
};

export function mapViolation(v: ApiViolation): UIViolation {
  const time = v.detected_at
    ? new Date(v.detected_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })
    : '--:--:--';

  return {
    id: v.id,
    violationCode: v.violation_code ?? v.id,
    trackId: `TRK-${String(v.track_id).padStart(3, '0')}`,
    time,
    role: v.role_detected ?? 'Unknown',
    helmColor: helmColorMap[v.helm_color_detected] ?? 'yellow',
    apdMissing: (v.missing_ppe_list ?? []).map(item => apdLabelMap[item] ?? item) as UIViolation['apdMissing'],
    status: v.personnel_id ? 'linked' : 'unlinked',
    personnelName: v.personnel_name ?? undefined,
    personnelId: v.personnel_id ?? undefined,
    cameraId: v.camera_id ?? 'CAM-01',
    zone: v.camera_id ? `ZONA ${v.camera_id.replace('CAM-', '')}` : 'ZONA A',
    framePath: v.frame_path ?? undefined,
  };
}

export function mapPersonnel(p: ApiPersonnel): UIPersonnel {
  return {
    id: p.id,
    employeeId: p.employee_id,
    name: p.full_name,
    role: p.role,
    helmColor: helmColorMap[p.helm_color] ?? 'yellow',
    department: p.department,
    email: p.email ?? null,
    sp: p.active_sp ?? null,
    totalViolations: p.violation_count ?? 0,
    violationTrend: [],
    active: p.is_active,
  };
}
