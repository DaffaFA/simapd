import { TokenResponse, User, Personnel, PaginatedResponse, Violation, SpRecord, SPLevel } from '../types/simapd';

const BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api/v1'

class ApiError extends Error { constructor(public status: number, public detail: string) { super(detail) } }

function getToken() {
  if (typeof window === 'undefined') return null
  return localStorage.getItem('simapd_token')
}

async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken()
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  })
  if (res.status === 401) {
    localStorage.removeItem('simapd_token')
    window.location.href = '/login'
    throw new ApiError(401, 'Unauthorized')
  }
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new ApiError(res.status, body.message ?? 'Request failed')
  }
  if (res.status === 204) return undefined as T
  return res.json()
}

async function apiDownload(path: string): Promise<Blob> {
  const token = getToken()
  const res = await fetch(`${BASE}${path}`, {
    headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
  })
  if (!res.ok) throw new ApiError(res.status, 'Download failed')
  return res.blob()
}

export const authApi = {
  login: (b: { username: string; password: string }) =>
    apiFetch<TokenResponse>('/auth/login', { method: 'POST', body: JSON.stringify(b) }),
  me: () => apiFetch<User>('/auth/me'),
}

export const personnelApi = {
  list: (p?: Record<string, any>) =>
    apiFetch<PaginatedResponse<Personnel>>(`/personnel?${new URLSearchParams(p??{})}`),
  get:    (id: string) => apiFetch<Personnel>(`/personnel/${id}`),
  create: (b: Partial<Personnel>) =>
    apiFetch<Personnel>('/personnel', { method: 'POST', body: JSON.stringify(b) }),
  update: (id: string, b: Partial<Personnel>) =>
    apiFetch<Personnel>(`/personnel/${id}`, { method: 'PUT', body: JSON.stringify(b) }),
  delete: (id: string) => apiFetch<void>(`/personnel/${id}`, { method: 'DELETE' }),
}

export const violationApi = {
  list: (p?: Record<string, any>) =>
    apiFetch<PaginatedResponse<Violation>>(`/violations?${new URLSearchParams(p??{})}`),
  get:    (id: string) => apiFetch<Violation>(`/violations/${id}`),
  link:   (id: string, b: { personnel_ids: string[]; notes?: string }) =>
    apiFetch<Violation>(`/violations/${id}/link`, { method: 'POST', body: JSON.stringify(b) }),
  unlink: (id: string) =>
    apiFetch<Violation>(`/violations/${id}/link`, { method: 'DELETE' }),
  frameUrl: (id: string) => `${BASE}/violations/${id}/frame`,
}

export const spApi = {
  issue:  (b: { personnel_id: string; level: SPLevel; notes?: string }) =>
    apiFetch<SpRecord>('/sp/issue', { method: 'POST', body: JSON.stringify(b) }),
  revoke: (id: string) => apiFetch<SpRecord>(`/sp/${id}/revoke`, { method: 'POST' }),
  getConfig:    () => apiFetch<any>('/sp/config'),
  updateConfig: (b: any) => apiFetch<any>('/sp/config', { method: 'PUT', body: JSON.stringify(b) }),
  getActive: (p?: Record<string, any>) =>
    apiFetch<PaginatedResponse<SpRecord>>(`/sp/active?${new URLSearchParams(p??{})}`),
}

export const analyticsApi = {
  dashboard: (p?: Record<string, any>) =>
    apiFetch<any>(`/analytics/dashboard?${new URLSearchParams(p??{})}`),
  exportCsv: async (p?: Record<string, any>) => {
    const blob = await apiDownload(`/analytics/export/csv?${new URLSearchParams(p??{})}`)
    const a = Object.assign(document.createElement('a'), {
      href: URL.createObjectURL(blob),
      download: `violations_${new Date().toISOString().slice(0,10)}.csv`,
    })
    a.click(); URL.revokeObjectURL(a.href)
  },
  exportPdf: async (p?: Record<string, any>) => {
    const blob = await apiDownload(`/analytics/export/pdf?${new URLSearchParams(p??{})}`)
    const a = Object.assign(document.createElement('a'), {
      href: URL.createObjectURL(blob),
      download: `laporan_apd_${new Date().toISOString().slice(0,10)}.pdf`,
    })
    a.click(); URL.revokeObjectURL(a.href)
  },
}

export function getViolationFrameUrl(violationId: string): string {
  return `${BASE}/violations/${violationId}/frame`;
}

export async function fetchViolationFrame(violationId: string): Promise<string | null> {
  try {
    const token = getToken();
    const res = await fetch(getViolationFrameUrl(violationId), {
      headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    });
    if (!res.ok) return null;
    const blob = await res.blob();
    return URL.createObjectURL(blob);
  } catch {
    return null;
  }
}

export interface ViolationLink {
  id:           string
  personnel_id: string
  personnel: {
    id:          string
    employee_id: string
    full_name:   string
    role:        string
    department:  string
  } | null
  linked_by: string
  linked_at: string
  notes:     string | null
}

export async function getViolationLinks(violationId: string): Promise<ViolationLink[]> {
  return apiFetch<ViolationLink[]>(`/violations/${violationId}/links`)
}

export async function linkViolationToPersonnel(
  violationId:  string,
  personnelIds: string[],
  notes?:       string,
): Promise<{ message: string; linked: ViolationLink[] }> {
  return apiFetch(`/violations/${violationId}/link`, {
    method: 'POST',
    body:   JSON.stringify({ personnel_ids: personnelIds, notes }),
  })
}

export async function unlinkViolationPersonnel(
  violationId: string,
  personnelId: string,
): Promise<void> {
  return apiFetch(`/violations/${violationId}/link/${personnelId}`, {
    method: 'DELETE',
  })
}

export async function searchPersonnel(query: string): Promise<Personnel[]> {
  return apiFetch<Personnel[]>(`/personnel?search=${encodeURIComponent(query)}&limit=10`)
}

// Get detail satu personnel
export async function getPersonnel(id: string): Promise<Personnel> {
  return apiFetch<Personnel>(`/personnel/${id}`)
}

// Update personnel
export async function updatePersonnel(
  id: string,
  data: Partial<any>, // UpdatePersonnelDto
): Promise<Personnel> {
  return apiFetch<Personnel>(`/personnel/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  })
}

// Get violations untuk satu personnel (via filter)
export async function getViolationsByPersonnel(
  personnelId: string,
  page = 1,
): Promise<PaginatedResponse<Violation>> {
  return apiFetch<PaginatedResponse<Violation>>(
    `/violations?personnel_id=${personnelId}&page=${page}&page_size=10`
  )
}

// Get SP records untuk satu personnel
export async function getSPRecordsByPersonnel(
  personnelId: string,
): Promise<SpRecord[]> {
  return apiFetch<SpRecord[]>(`/sp?personnel_id=${personnelId}`)
}
