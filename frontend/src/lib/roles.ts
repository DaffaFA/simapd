import { Role } from '../types/simapd'

export const ROLE_LABELS: Record<Role, string> = {
  safety_officer: 'Safety Officer',
  supervisor: 'Supervisor',
  admin: 'Admin',
}

// Sync dengan @Roles(...) di backend-nest - role yang boleh membuat/mengubah/menghapus data
export const EDITOR_ROLES: Role[] = ['safety_officer', 'admin']

export function hasRole(role: Role | undefined | null, allowed: Role[]): boolean {
  if (!role) return false
  return allowed.includes(role)
}
