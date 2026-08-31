import type { ReactNode } from 'react';
import { FormulaInfo } from './FormulaInfo';

interface StatCardProps {
  label: string;
  value: string;
  subtext: string;
  trend?: string;
  trendUp?: boolean;
  icon: ReactNode;
  valueColor?: string;
  accentColor?: string;
  formula?: string;
}

export function StatCard({ label, value, subtext, trend, trendUp, icon, valueColor = '#E2E8F0', accentColor = '#F97316', formula }: StatCardProps) {
  return (
    <div
      style={{
        background: '#111827',
        border: '1px solid #1E2D3D',
        borderRadius: 10,
        padding: '16px 20px',
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        position: 'relative',
        overflow: 'hidden',
        flex: 1,
      }}
    >
      <div style={{ borderBottom: `2px solid ${accentColor}`, position: 'absolute', bottom: 0, left: 0, right: 0, opacity: 0.5 }} />
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 11, fontFamily: 'DM Sans, sans-serif', fontWeight: 600, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          {label}
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {formula && <FormulaInfo formula={formula} />}
          <span style={{ color: accentColor, opacity: 0.8 }}>{icon}</span>
        </div>
      </div>
      <div>
        <span style={{ fontSize: 28, fontFamily: 'JetBrains Mono, monospace', fontWeight: 500, color: valueColor, lineHeight: 1.1 }}>
          {value}
        </span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 12, color: '#64748B', fontFamily: 'DM Sans, sans-serif' }}>{subtext}</span>
        {trend && (
          <span style={{ fontSize: 11, fontFamily: 'JetBrains Mono, monospace', color: trendUp ? '#22C55E' : '#EF4444', fontWeight: 500 }}>
            {trendUp ? '▲' : '▼'} {trend}
          </span>
        )}
      </div>
    </div>
  );
}
