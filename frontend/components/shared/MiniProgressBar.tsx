interface MiniProgressBarProps {
  value: number;
  max?: number;
}

export function MiniProgressBar({ value, max = 12 }: MiniProgressBarProps) {
  const pct = Math.min((value / max) * 100, 100);
  const color = value >= 7 ? '#EF4444' : value >= 3 ? '#F59E0B' : '#22C55E';

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 13, color: color, fontWeight: 500, minWidth: 16 }}>
        {value}
      </span>
      <div style={{ flex: 1, height: 4, background: '#1E2D3D', borderRadius: 2, overflow: 'hidden', minWidth: 60 }}>
        <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 2, transition: 'width 0.4s ease' }} />
      </div>
    </div>
  );
}
