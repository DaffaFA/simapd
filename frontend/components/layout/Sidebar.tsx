'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { LayoutDashboard, AlertTriangle, Users, BarChart2, Shield, Settings, LogOut, ChevronUp } from 'lucide-react';
import { useAuth } from '@/src/lib/AuthContext';
import { ROLE_LABELS, EDITOR_ROLES, hasRole } from '@/src/lib/roles';
import type { Role } from '@/src/types/simapd';

const navItems: { to: string; label: string; icon: typeof LayoutDashboard; roles?: Role[] }[] = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/violations', label: 'Pelanggaran', icon: AlertTriangle },
  { to: '/personnel', label: 'Personel & SP', icon: Users },
  { to: '/analytics', label: 'Analitik', icon: BarChart2 },
  // Pengaturan mengubah konfigurasi SP & kamera - dibatasi sama seperti @Roles() di backend
  { to: '/settings', label: 'Pengaturan', icon: Settings, roles: EDITOR_ROLES },
];

export function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const visibleItems = navItems.filter((item) => !item.roles || hasRole(user?.role, item.roles));
  const initials = user?.full_name
    ? user.full_name.split(' ').filter(Boolean).slice(0, 2).map((s) => s[0]!.toUpperCase()).join('')
    : '?';

  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const onClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, [menuOpen]);

  return (
    <aside
      style={{
        width: 220,
        minWidth: 220,
        background: '#0D1117',
        borderRight: '1px solid #1E2D3D',
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        position: 'sticky',
        top: 0,
        zIndex: 10,
      }}
    >
      {/* Logo */}
      <div style={{ padding: '16px 20px 12px', borderBottom: '1px solid #1E2D3D' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 32, height: 32, background: '#F97316', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Shield size={18} color="#fff" strokeWidth={2.5} />
          </div>
          <div>
            <div style={{ fontSize: 15, fontFamily: 'DM Sans, sans-serif', fontWeight: 700, color: '#E2E8F0', letterSpacing: '-0.01em' }}>SiMAPD</div>
            <div style={{ fontSize: 10, fontFamily: 'DM Sans, sans-serif', fontWeight: 400, color: '#64748B', letterSpacing: '0.05em', textTransform: 'uppercase' }}>Safety Monitor</div>
          </div>
        </div>

        {/* Camera status badge */}
        <div
          style={{
            marginTop: 12,
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            background: 'rgba(34,197,94,0.08)',
            border: '1px solid rgba(34,197,94,0.2)',
            borderRadius: 6,
            padding: '5px 10px',
          }}
        >
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#22C55E' }} />
          <span style={{ fontSize: 11, fontFamily: 'JetBrains Mono, monospace', color: '#22C55E' }}>4 CAM ONLINE</span>
        </div>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: '12px 10px', display: 'flex', flexDirection: 'column', gap: 2 }}>
        {visibleItems.map(({ to, label, icon: Icon }) => {
          const isActive = to === '/' ? pathname === '/' : pathname.startsWith(to);
          return (
            <Link
              key={to}
              href={to}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '9px 12px',
                borderRadius: 8,
                textDecoration: 'none',
                fontSize: 13,
                fontFamily: 'DM Sans, sans-serif',
                fontWeight: isActive ? 600 : 400,
                color: isActive ? '#F97316' : '#94A3B8',
                background: isActive ? 'rgba(249,115,22,0.1)' : 'transparent',
                border: isActive ? '1px solid rgba(249,115,22,0.2)' : '1px solid transparent',
                transition: 'all 0.15s ease',
              }}
            >
              <Icon size={16} color={isActive ? '#F97316' : '#64748B'} />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* User strip */}
      <div ref={menuRef} style={{ position: 'relative' }}>
        {menuOpen && (
          <div
            style={{
              position: 'absolute',
              bottom: '100%',
              left: 12,
              right: 12,
              marginBottom: 6,
              background: '#161B22',
              border: '1px solid #1E2D3D',
              borderRadius: 8,
              padding: 4,
              boxShadow: '0 -4px 16px rgba(0,0,0,0.35)',
              zIndex: 20,
            }}
          >
            <button
              type="button"
              onClick={() => {
                setMenuOpen(false);
                logout();
              }}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '8px 10px',
                borderRadius: 6,
                border: 'none',
                background: 'transparent',
                color: '#F87171',
                fontSize: 12,
                fontFamily: 'DM Sans, sans-serif',
                fontWeight: 600,
                cursor: 'pointer',
                textAlign: 'left',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(248,113,113,0.1)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
            >
              <LogOut size={14} color="#F87171" />
              Keluar
            </button>
          </div>
        )}

        <button
          type="button"
          onClick={() => setMenuOpen((open) => !open)}
          style={{
            width: '100%',
            padding: '12px 16px',
            borderTop: '1px solid #1E2D3D',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            background: menuOpen ? '#131A24' : 'transparent',
            border: 'none',
            borderTopWidth: 1,
            borderTopStyle: 'solid',
            borderTopColor: '#1E2D3D',
            cursor: 'pointer',
            textAlign: 'left',
          }}
        >
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: '50%',
              background: 'rgba(34,197,94,0.15)',
              border: '1.5px solid rgba(34,197,94,0.4)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 13,
              color: '#22C55E',
              fontFamily: 'DM Sans, sans-serif',
              fontWeight: 700,
              flexShrink: 0,
            }}
          >
            {initials}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12, fontFamily: 'DM Sans, sans-serif', fontWeight: 600, color: '#E2E8F0' }}>{user?.full_name ?? '-'}</div>
            <div style={{ fontSize: 10, fontFamily: 'DM Sans, sans-serif', color: '#64748B' }}>{user ? ROLE_LABELS[user.role] : ''}</div>
          </div>
          <ChevronUp
            size={14}
            color="#64748B"
            style={{ transition: 'transform 0.15s ease', transform: menuOpen ? 'rotate(0deg)' : 'rotate(180deg)', flexShrink: 0 }}
          />
        </button>
      </div>
    </aside>
  );
}
