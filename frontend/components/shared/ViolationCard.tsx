import type { Violation } from './types';
import { HelmDot } from './HelmDot';
import { APDChip } from './APDChip';
import { LinkedBadge } from './StatusBadge';

interface ViolationCardProps {
  violation: Violation;
}

export function ViolationCard({ violation }: ViolationCardProps) {
  const severity = violation.apdMissing.length >= 2 ? 'high' : 'medium';
  const borderColor = severity === 'high' ? '#EF4444' : '#F59E0B';

  return (
    <div
      style={{
        background: '#111827',
        border: '1px solid #1E2D3D',
        borderLeft: `3px solid ${borderColor}`,
        borderRadius: '0 8px 8px 0',
        padding: '12px 14px',
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        boxShadow: severity === 'high' ? '0 0 12px rgba(239,68,68,0.12)' : undefined,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 13, color: '#F97316', fontWeight: 500 }}>
          {violation.trackId}
        </span>
        <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: '#64748B' }}>
          {violation.time}
        </span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <HelmDot color={violation.helmColor} />
        <span style={{ fontSize: 12, color: '#94A3B8', fontFamily: 'DM Sans, sans-serif' }}>{violation.role}</span>
        {violation.personnelName && (
          <>
            <span style={{ color: '#1E2D3D' }}>·</span>
            <span style={{ fontSize: 12, color: '#E2E8F0', fontFamily: 'DM Sans, sans-serif' }}>{violation.personnelName}</span>
          </>
        )}
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, alignItems: 'center' }}>
        {violation.apdMissing.map(apd => (
          <APDChip key={apd} item={apd} />
        ))}
        <div style={{ marginLeft: 'auto' }}>
          <LinkedBadge status={violation.status} />
        </div>
      </div>
    </div>
  );
}
