import type { SPLevel, ViolationStatus } from './types';

interface SPBadgeProps {
  level: SPLevel;
}

interface StatusBadgeProps {
  status: ViolationStatus;
}

export function SPBadge({ level }: SPBadgeProps) {
  if (!level) return null;

  const config = {
    SP1: { bg: 'rgba(245,158,11,0.15)', color: '#F59E0B', border: 'rgba(245,158,11,0.3)' },
    SP2: { bg: 'rgba(239,68,68,0.15)', color: '#EF4444', border: 'rgba(239,68,68,0.3)' },
    SP3: { bg: 'rgba(139,92,246,0.15)', color: '#A78BFA', border: 'rgba(139,92,246,0.3)' },
  }[level];

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '2px 8px',
        borderRadius: 4,
        fontSize: 11,
        fontFamily: 'DM Sans, sans-serif',
        fontWeight: 600,
        background: config.bg,
        color: config.color,
        border: `1px solid ${config.border}`,
        letterSpacing: '0.05em',
      }}
    >
      {level}
    </span>
  );
}

export function LinkedBadge({ status }: StatusBadgeProps) {
  const isLinked = status === 'linked';
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        padding: '2px 8px',
        borderRadius: 4,
        fontSize: 11,
        fontFamily: 'DM Sans, sans-serif',
        fontWeight: 600,
        background: isLinked ? 'rgba(34,197,94,0.12)' : 'rgba(100,116,139,0.12)',
        color: isLinked ? '#22C55E' : '#64748B',
        border: isLinked ? '1px solid rgba(34,197,94,0.25)' : '1px solid rgba(100,116,139,0.25)',
      }}
    >
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: isLinked ? '#22C55E' : '#64748B', display: 'inline-block' }} />
      {isLinked ? 'linked' : 'unlinked'}
    </span>
  );
}
