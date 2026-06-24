import type { HelmColor } from './types';

interface HelmDotProps {
  color: HelmColor;
  size?: number;
}

const helmColorMap: Record<HelmColor, string> = {
  yellow: '#EAB308',
  white: '#E2E8F0',
  green: '#22C55E',
};

const helmLabelMap: Record<HelmColor, string> = {
  yellow: 'Pekerja',
  white: 'Supervisor',
  green: 'Safety Officer',
};

export function HelmDot({ color, size = 10 }: HelmDotProps) {
  return (
    <span
      title={helmLabelMap[color]}
      style={{
        display: 'inline-block',
        width: size,
        height: size,
        borderRadius: '50%',
        backgroundColor: helmColorMap[color],
        flexShrink: 0,
      }}
    />
  );
}

export { helmColorMap, helmLabelMap };
