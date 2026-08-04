import { useEffect, useState } from 'react';
import type { DetectionMsg } from '@/src/types/simapd';

interface CameraFeedProps {
  detections?: DetectionMsg[];
  cameraId?: string;
  hideOverlay?: boolean;
}

interface BoundingBoxData {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  violation: boolean;
  trackId: string;
  role: string;
  helmColor: string;
}

const staticBoxes: BoundingBoxData[] = [
  { id: '1', x: 8, y: 28, w: 14, h: 38, violation: true, trackId: 'TRK-012', role: 'Pekerja', helmColor: '#EAB308' },
  { id: '2', x: 32, y: 22, w: 12, h: 35, violation: false, trackId: 'TRK-008', role: 'Supervisor', helmColor: '#E2E8F0' },
  { id: '3', x: 58, y: 30, w: 13, h: 36, violation: false, trackId: 'TRK-019', role: 'Safety Officer', helmColor: '#22C55E' },
];

const HELM_COLOR_MAP: Record<string, string> = {
  'Kuning': '#EAB308',
  'Putih': '#E2E8F0',
  'Hijau': '#22C55E',
  'Unknown': '#94A3B8'
};

function GridOverlay() {
  const lines = [];
  for (let i = 1; i < 6; i++) {
    lines.push(
      <line key={`v${i}`} x1={`${i * 16.66}%`} y1="0" x2={`${i * 16.66}%`} y2="100%" stroke="#1E2D3D" strokeWidth="0.5" />,
      <line key={`h${i}`} x1="0" y1={`${i * 20}%`} x2="100%" y2={`${i * 20}%`} stroke="#1E2D3D" strokeWidth="0.5" />
    );
  }
  return (
    <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0.4 }}>
      {lines}
    </svg>
  );
}

function BoundingBox({ box }: { box: BoundingBoxData }) {
  const color = box.violation ? '#EF4444' : '#22C55E';
  const glow = box.violation ? '0 0 12px rgba(239,68,68,0.45)' : '0 0 8px rgba(34,197,94,0.3)';

  return (
    <div
      style={{
        position: 'absolute',
        left: `${box.x}%`,
        top: `${box.y}%`,
        width: `${box.w}%`,
        height: `${box.h}%`,
        border: `1.5px solid ${color}`,
        borderRadius: 2,
        boxShadow: glow,
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: -20,
          left: -1,
          background: box.violation ? 'rgba(239,68,68,0.85)' : 'rgba(34,197,94,0.85)',
          borderRadius: '3px 3px 0 0',
          padding: '1px 6px',
          fontSize: 10,
          fontFamily: 'JetBrains Mono, monospace',
          color: '#fff',
          whiteSpace: 'nowrap',
        }}
      >
        {box.trackId} · {box.role}
      </div>
      <div
        style={{
          position: 'absolute',
          bottom: -14,
          left: 4,
          width: 8,
          height: 8,
          borderRadius: '50%',
          background: box.helmColor,
          border: '1px solid rgba(255,255,255,0.3)',
        }}
      />
    </div>
  );
}

export function CameraFeed({ detections = [], cameraId = 'CAM-01', hideOverlay = false }: CameraFeedProps) {
  const [time, setTime] = useState('');
  const [blinkOn, setBlinkOn] = useState(true);
  const [activeBoxes, setActiveBoxes] = useState<BoundingBoxData[]>([]);

  useEffect(() => {
    const tick = () => setTime(new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const id = setInterval(() => setBlinkOn(v => !v), 800);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (detections.length === 0) {
      setActiveBoxes([]);
      return;
    }

    // Deduplicate by track_id, keeping only the most recent (which appears first in lastDetections since it unshifts)
    const latestByTrackId = new Map<number, DetectionMsg>();
    const now = Date.now();

    for (const d of detections) {
      if (!latestByTrackId.has(d.track_id)) {
        // Parse timestamp and check if it's recent (within 2 seconds to handle network latency + 10fps stream)
        const detTime = new Date(d.timestamp).getTime();
        if (now - detTime < 2000) {
          latestByTrackId.set(d.track_id, d);
        }
      }
    }

    const newBoxes = Array.from(latestByTrackId.values()).map(d => {
      const [xmin, ymin, xmax, ymax] = d.bbox;
      const wPixel = xmax - xmin;
      const hPixel = ymax - ymin;
      return {
        id: String(d.track_id),
        x: (xmin / 1920) * 100,
        y: (ymin / 1080) * 100,
        w: (wPixel / 1920) * 100,
        h: (hPixel / 1080) * 100,
        violation: !d.is_compliant,
        trackId: `TRK-${String(d.track_id).padStart(3, '0')}`,
        role: d.role_label,
        helmColor: HELM_COLOR_MAP[d.helm_color] || HELM_COLOR_MAP['Unknown']
      };
    });

    setActiveBoxes(newBoxes);
  }, [detections]);

  // Map real detections or fallback to static mock boxes
  const boxesToRender = activeBoxes.length > 0 ? activeBoxes : staticBoxes;

  const totalDetected = boxesToRender.length;
  const totalViolations = boxesToRender.filter(b => b.violation).length;

  return (
    <div
      style={{
        position: 'relative',
        background: '#060A0E',
        borderRadius: 8,
        overflow: 'hidden',
        aspectRatio: '16/9',
        width: '100%',
      }}
    >
      <GridOverlay />

      {/* silhouette shapes (only show if no live data) */}
      {detections.length === 0 && (
        <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0.07 }}>
          <rect x="8%" y="28%" width="14%" height="38%" rx="2" fill="#E2E8F0" />
          <rect x="32%" y="22%" width="12%" height="35%" rx="2" fill="#E2E8F0" />
          <rect x="58%" y="30%" width="13%" height="36%" rx="2" fill="#E2E8F0" />
        </svg>
      )}

      {boxesToRender.map(box => (
        <BoundingBox key={box.id} box={box} />
      ))}

      {/* HUD: top-left LIVE */}
      <div style={{ position: 'absolute', top: 10, left: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
        <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#EF4444', opacity: blinkOn ? 1 : 0.2, transition: 'opacity 0.2s' }} />
        <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: '#EF4444', letterSpacing: '0.1em' }}>LIVE</span>
      </div>

      {/* HUD: top-right cam info */}
      {!hideOverlay && (
        <div style={{ position: 'absolute', top: 10, right: 12, display: 'flex', gap: 4, flexDirection: 'column', alignItems: 'flex-end' }}>
          <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: '#64748B' }}>{cameraId} · ZONA A · 1920×1080</span>
        </div>
      )}

      {/* HUD: bottom-left */}
      {!hideOverlay && (
        <div style={{ position: 'absolute', bottom: 10, left: 12, display: 'flex', flexDirection: 'column', gap: 2 }}>
          <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: '#64748B' }}>{time} · YOLOv8m · ByteTrack</span>
        </div>
      )}

      {/* HUD: bottom-right */}
      {!hideOverlay && (
        <div style={{ position: 'absolute', bottom: 10, right: 12 }}>
          <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10 }}>
            <span style={{ color: '#22C55E' }}>{totalDetected} detected</span>
            <span style={{ color: '#64748B' }}> · </span>
            <span style={{ color: '#EF4444' }}>{totalViolations} violation</span>
          </span>
        </div>
      )}

      {/* tag row */}
      {!hideOverlay && (
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, display: 'flex', gap: 0 }}>
          {['SAHI Active', 'ByteTrack v2', '50ms latency', 'YOLOv8m @ .87 mAP'].map(tag => (
            <span
              key={tag}
              style={{
                fontFamily: 'JetBrains Mono, monospace',
                fontSize: 9,
                color: '#64748B',
                background: 'rgba(13,17,23,0.8)',
                padding: '3px 8px',
                borderTop: '1px solid #1E2D3D',
                borderRight: '1px solid #1E2D3D',
              }}
            >
              {tag}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
