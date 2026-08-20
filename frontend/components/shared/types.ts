export type HelmColor = 'yellow' | 'white' | 'green';
export type SPLevel = 'SP1' | 'SP2' | 'SP3' | null;
export type ViolationStatus = 'linked' | 'unlinked';
export type APDItem = 'Helm' | 'Rompi' | 'Sepatu';

export interface Violation {
  id: string;
  violationCode: string;
  trackId: string;
  time: string;
  role: string;
  helmColor: HelmColor;
  apdMissing: APDItem[];
  status: ViolationStatus;
  personnelName?: string;
  personnelId?: string;
  cameraId: string;
  zone: string;
  framePath?: string;
}

export interface Personnel {
  id: string;
  employeeId: string;
  name: string;
  role: string;
  helmColor: HelmColor;
  department: string;
  email: string | null;
  sp: SPLevel;
  totalViolations: number;
  violationTrend: number[];
  active: boolean;
}

export interface AnalyticsDay {
  day: string;
  compliance: number;
  violations: number;
}
