import type { APDItem } from './types';

interface APDChipProps {
  item: APDItem;
}

export function APDChip({ item }: APDChipProps) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 3,
        padding: '2px 7px',
        borderRadius: 4,
        fontSize: 11,
        fontFamily: 'DM Sans, sans-serif',
        fontWeight: 600,
        background: 'rgba(239,68,68,0.13)',
        color: '#EF4444',
        border: '1px solid rgba(239,68,68,0.25)',
      }}
    >
      ⚠ {item}
    </span>
  );
}
