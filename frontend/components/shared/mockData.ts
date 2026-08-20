import type { Violation, Personnel, AnalyticsDay } from './types';

export const mockViolations: Violation[] = [
  { id: 'VIO-0041', violationCode: 'VIO-0041', trackId: 'TRK-012', time: '14:23:07', role: 'Pekerja', helmColor: 'yellow', apdMissing: ['Helm', 'Rompi'], status: 'linked', personnelName: 'Budi Santoso', personnelId: 'EMP-021', cameraId: 'CAM-01', zone: 'ZONA A' },
  { id: 'VIO-0040', violationCode: 'VIO-0040', trackId: 'TRK-008', time: '14:21:44', role: 'Pekerja', helmColor: 'yellow', apdMissing: ['Rompi'], status: 'linked', personnelName: 'Ahmad Fauzi', personnelId: 'EMP-014', cameraId: 'CAM-02', zone: 'ZONA B' },
  { id: 'VIO-0039', violationCode: 'VIO-0039', trackId: 'TRK-019', time: '14:19:31', role: 'Supervisor', helmColor: 'white', apdMissing: ['Helm'], status: 'unlinked', cameraId: 'CAM-01', zone: 'ZONA A' },
  { id: 'VIO-0038', violationCode: 'VIO-0038', trackId: 'TRK-005', time: '14:15:02', role: 'Pekerja', helmColor: 'yellow', apdMissing: ['Sepatu'], status: 'linked', personnelName: 'Eko Prasetyo', personnelId: 'EMP-007', cameraId: 'CAM-03', zone: 'ZONA C' },
  { id: 'VIO-0037', violationCode: 'VIO-0037', trackId: 'TRK-023', time: '14:12:18', role: 'Pekerja', helmColor: 'yellow', apdMissing: ['Helm', 'Sepatu'], status: 'unlinked', cameraId: 'CAM-02', zone: 'ZONA B' },
  { id: 'VIO-0036', violationCode: 'VIO-0036', trackId: 'TRK-011', time: '14:08:55', role: 'Pekerja', helmColor: 'yellow', apdMissing: ['Rompi', 'Sepatu'], status: 'linked', personnelName: 'Slamet Widodo', personnelId: 'EMP-033', cameraId: 'CAM-04', zone: 'ZONA D' },
  { id: 'VIO-0035', violationCode: 'VIO-0035', trackId: 'TRK-007', time: '14:04:22', role: 'Safety Officer', helmColor: 'green', apdMissing: ['Rompi'], status: 'linked', personnelName: 'Hendra Kusuma', personnelId: 'EMP-002', cameraId: 'CAM-01', zone: 'ZONA A' },
  { id: 'VIO-0034', violationCode: 'VIO-0034', trackId: 'TRK-031', time: '14:01:09', role: 'Pekerja', helmColor: 'yellow', apdMissing: ['Helm'], status: 'unlinked', cameraId: 'CAM-03', zone: 'ZONA C' },
  { id: 'VIO-0033', violationCode: 'VIO-0033', trackId: 'TRK-016', time: '13:58:47', role: 'Supervisor', helmColor: 'white', apdMissing: ['Sepatu'], status: 'linked', personnelName: 'Doni Setiawan', personnelId: 'EMP-009', cameraId: 'CAM-02', zone: 'ZONA B' },
  { id: 'VIO-0032', violationCode: 'VIO-0032', trackId: 'TRK-004', time: '13:55:33', role: 'Pekerja', helmColor: 'yellow', apdMissing: ['Helm', 'Rompi', 'Sepatu'], status: 'linked', personnelName: 'Rudi Hartono', personnelId: 'EMP-041', cameraId: 'CAM-04', zone: 'ZONA D' },
  { id: 'VIO-0031', violationCode: 'VIO-0031', trackId: 'TRK-027', time: '13:50:14', role: 'Pekerja', helmColor: 'yellow', apdMissing: ['Rompi'], status: 'unlinked', cameraId: 'CAM-01', zone: 'ZONA A' },
  { id: 'VIO-0030', violationCode: 'VIO-0030', trackId: 'TRK-018', time: '13:47:02', role: 'Pekerja', helmColor: 'yellow', apdMissing: ['Helm'], status: 'linked', personnelName: 'Wahyu Nugroho', personnelId: 'EMP-025', cameraId: 'CAM-02', zone: 'ZONA B' },
];

export const mockPersonnel: Personnel[] = [
  { id: 'EMP-002', employeeId: 'EMP-002', name: 'Hendra Kusuma', role: 'Safety Officer', helmColor: 'green', department: 'K3', email: 'hendra.kusuma@simapd.local', sp: null, totalViolations: 1, violationTrend: [0,0,1,0,0,0,0], active: true },
  { id: 'EMP-007', employeeId: 'EMP-007', name: 'Eko Prasetyo', role: 'Pekerja', helmColor: 'yellow', department: 'Bongkar Muat', email: 'eko.prasetyo@simapd.local', sp: null, totalViolations: 2, violationTrend: [0,1,0,0,1,0,0], active: true },
  { id: 'EMP-009', employeeId: 'EMP-009', name: 'Doni Setiawan', role: 'Supervisor', helmColor: 'white', department: 'Operasional', email: 'doni.setiawan@simapd.local', sp: null, totalViolations: 3, violationTrend: [1,0,0,1,0,1,0], active: true },
  { id: 'EMP-014', employeeId: 'EMP-014', name: 'Ahmad Fauzi', role: 'Pekerja', helmColor: 'yellow', department: 'Bongkar Muat', email: 'ahmad.fauzi@simapd.local', sp: 'SP1', totalViolations: 4, violationTrend: [0,1,1,0,1,0,1], active: true },
  { id: 'EMP-021', employeeId: 'EMP-021', name: 'Budi Santoso', role: 'Pekerja', helmColor: 'yellow', department: 'Bongkar Muat', email: 'budi.santoso@simapd.local', sp: 'SP1', totalViolations: 5, violationTrend: [1,0,1,1,0,1,1], active: true },
  { id: 'EMP-025', employeeId: 'EMP-025', name: 'Wahyu Nugroho', role: 'Pekerja', helmColor: 'yellow', department: 'Teknik', email: 'wahyu.nugroho@simapd.local', sp: null, totalViolations: 2, violationTrend: [0,0,1,0,1,0,0], active: true },
  { id: 'EMP-033', employeeId: 'EMP-033', name: 'Slamet Widodo', role: 'Pekerja', helmColor: 'yellow', department: 'Bongkar Muat', email: 'slamet.widodo@simapd.local', sp: 'SP2', totalViolations: 8, violationTrend: [2,1,1,1,1,1,1], active: true },
  { id: 'EMP-041', employeeId: 'EMP-041', name: 'Rudi Hartono', role: 'Pekerja', helmColor: 'yellow', department: 'Cargo', email: 'rudi.hartono@simapd.local', sp: 'SP2', totalViolations: 9, violationTrend: [1,2,1,2,1,1,1], active: true },
  { id: 'EMP-045', employeeId: 'EMP-045', name: 'Surya Permana', role: 'Pekerja', helmColor: 'yellow', department: 'Cargo', email: 'surya.permana@simapd.local', sp: null, totalViolations: 1, violationTrend: [0,0,0,1,0,0,0], active: true },
  { id: 'EMP-052', employeeId: 'EMP-052', name: 'Agus Trianto', role: 'Supervisor', helmColor: 'white', department: 'Operasional', email: 'agus.trianto@simapd.local', sp: null, totalViolations: 0, violationTrend: [0,0,0,0,0,0,0], active: true },
];

export const mockAnalytics: AnalyticsDay[] = [
  { day: 'Sen', compliance: 72.1, violations: 24 },
  { day: 'Sel', compliance: 75.4, violations: 19 },
  { day: 'Rab', compliance: 74.8, violations: 21 },
  { day: 'Kam', compliance: 79.2, violations: 15 },
  { day: 'Jum', compliance: 76.5, violations: 18 },
  { day: 'Sab', compliance: 81.3, violations: 12 },
  { day: 'Min', compliance: 78.4, violations: 17 },
];
