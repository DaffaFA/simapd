'use client';

import { Bell, Wifi } from 'lucide-react';

interface HeaderProps {
  title: string;
  subtitle?: string;
}

export function Header({ title, subtitle }: HeaderProps) {
  return (
    <header
      style={{
        height: 56,
        background: '#0D1117',
        borderBottom: '1px solid #1E2D3D',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 24px',
        position: 'sticky',
        top: 0,
        zIndex: 5,
      }}
    >
      <div>
        <h1 style={{ fontSize: 17, fontFamily: 'DM Sans, sans-serif', fontWeight: 700, color: '#E2E8F0', margin: 0 }}>{title}</h1>
        {subtitle && <p style={{ fontSize: 11, fontFamily: 'DM Sans, sans-serif', color: '#64748B', margin: 0 }}>{subtitle}</p>}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        {/* System status */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)', borderRadius: 6, padding: '4px 10px' }}>
          <Wifi size={13} color="#22C55E" />
          <span style={{ fontSize: 11, fontFamily: 'JetBrains Mono, monospace', color: '#22C55E' }}>SISTEM AKTIF</span>
        </div>

        {/* Notification */}
        <div style={{ position: 'relative', cursor: 'pointer' }}>
          <Bell size={18} color="#94A3B8" />
          <span style={{ position: 'absolute', top: -4, right: -4, width: 14, height: 14, borderRadius: '50%', background: '#EF4444', fontSize: 9, fontFamily: 'DM Sans, sans-serif', fontWeight: 700, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>3</span>
        </div>

        {/* Timestamp */}
        <span suppressHydrationWarning style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: '#64748B' }}>
          {new Date().toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}
        </span>
      </div>
    </header>
  );
}
