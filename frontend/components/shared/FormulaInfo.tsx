interface FormulaInfoProps {
  formula: string;
}

/** Small "i" badge with a hover tooltip explaining how a stat/card value is calculated. */
export function FormulaInfo({ formula }: FormulaInfoProps) {
  return (
    <div className="group relative inline-flex shrink-0">
      <span
        style={{
          width: 15,
          height: 15,
          borderRadius: '50%',
          border: '1px solid #475569',
          color: '#94A3B8',
          fontSize: 9,
          fontFamily: 'DM Sans, sans-serif',
          fontWeight: 700,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'help',
        }}
      >
        i
      </span>
      <div
        className="pointer-events-none invisible absolute right-0 top-full z-20 mt-1.5 w-56 opacity-0 transition-opacity duration-150 group-hover:visible group-hover:opacity-100"
        style={{
          background: '#1E293B',
          border: '1px solid #1E2D3D',
          borderRadius: 6,
          padding: '8px 10px',
          fontSize: 11,
          fontFamily: 'DM Sans, sans-serif',
          color: '#CBD5E1',
          lineHeight: 1.5,
        }}
      >
        {formula}
      </div>
    </div>
  );
}
