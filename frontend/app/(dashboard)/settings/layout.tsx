'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Settings, Camera, Users } from 'lucide-react'
import { useAuth } from '@/src/lib/AuthContext'
import { hasRole } from '@/src/lib/roles'

const TABS = [
  { href: '/settings/sp-config', label: 'Konfigurasi SP', Icon: Settings },
  { href: '/settings/cameras',   label: 'Manajemen Kamera', Icon: Camera },
  { href: '/settings/akun',      label: 'Manajemen Akun', Icon: Users, adminOnly: true },
]

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  const path = usePathname()
  const { user } = useAuth()
  const isAdmin = hasRole(user?.role, ['admin'])
  const tabs = TABS.filter(t => !t.adminOnly || isAdmin)

  return (
    <div style={{ display: 'flex', gap: 24 }}>
      {/* Sidebar tabs */}
      <nav style={{
        width: 200, minWidth: 200,
        display: 'flex', flexDirection: 'column', gap: 2,
        paddingTop: 4,
      }}>
        {tabs.map(tab => {
          const isActive = path === tab.href
          return (
            <Link key={tab.href} href={tab.href}
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '10px 14px', borderRadius: 8,
                textDecoration: 'none',
                fontSize: 13, fontFamily: 'DM Sans, sans-serif',
                fontWeight: isActive ? 600 : 400,
                color: isActive ? '#F97316' : '#94A3B8',
                background: isActive ? 'rgba(249,115,22,0.1)' : 'transparent',
                border: isActive ? '1px solid rgba(249,115,22,0.2)' : '1px solid transparent',
                transition: 'all 0.15s ease',
              }}
            >
              <tab.Icon size={15} color={isActive ? '#F97316' : '#64748B'} />
              {tab.label}
            </Link>
          )
        })}
      </nav>

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        {children}
      </div>
    </div>
  )
}
