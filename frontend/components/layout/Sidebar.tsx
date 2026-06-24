'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, AlertTriangle, Users, BarChart2, Shield } from 'lucide-react';

const navItems = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/violations', label: 'Pelanggaran', icon: AlertTriangle },
  { to: '/personnel', label: 'Personel & SP', icon: Users },
  { to: '/analytics', label: 'Analitik', icon: BarChart2 },
];

export function Sidebar() {
  const pathname = usePathname();

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
        {navItems.map(({ to, label, icon: Icon }) => {
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
      <div
        style={{
          padding: '12px 16px',
          borderTop: '1px solid #1E2D3D',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
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
          SO
        </div>
        <div>
          <div style={{ fontSize: 12, fontFamily: 'DM Sans, sans-serif', fontWeight: 600, color: '#E2E8F0' }}>Safety Officer</div>
          <div style={{ fontSize: 10, fontFamily: 'DM Sans, sans-serif', color: '#64748B' }}>Shift Pagi</div>
        </div>
      </div>
    </aside>
  );
}
