import { useState } from 'react';
import { CameraFeed } from './CameraFeed';
import type { DetectionMsg } from '@/src/types/simapd';

interface CameraGridProps {
  detections: DetectionMsg[];
}

export function CameraGrid({ detections }: CameraGridProps) {
  const [activeCam, setActiveCam] = useState('CAM-01');
  const cameras = ['CAM-01', 'CAM-02', 'CAM-03', 'CAM-04'];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* Header controls */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h2 style={{ fontSize: 13, fontFamily: 'DM Sans, sans-serif', fontWeight: 600, color: '#E2E8F0', margin: 0, textTransform: 'uppercase', letterSpacing: '0.07em' }}>
          Kamera Aktif
        </h2>
        <div style={{ display: 'flex', gap: 8 }}>
          {cameras.map(cam => (
            <button
              key={cam}
              onClick={() => setActiveCam(cam)}
              style={{
                fontFamily: 'JetBrains Mono, monospace',
                fontSize: 10,
                padding: '3px 8px',
                borderRadius: 4,
                border: `1px solid ${activeCam === cam ? '#F97316' : '#1E2D3D'}`,
                background: activeCam === cam ? 'rgba(249,115,22,0.1)' : 'transparent',
                color: activeCam === cam ? '#F97316' : '#64748B',
                cursor: 'pointer',
              }}
            >
              {cam}
            </button>
          ))}
        </div>
      </div>

      {/* Main Grid Layout */}
      <div style={{ display: 'grid', gridTemplateColumns: '3fr 1fr', gap: 12 }}>
        {/* Main large view */}
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <CameraFeed detections={activeCam === 'CAM-01' ? detections : []} cameraId={activeCam} />
        </div>
        
        {/* Thumbnails */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, justifyContent: 'space-between' }}>
          {cameras.filter(c => c !== activeCam).map(cam => (
            <div 
              key={cam}
              onClick={() => setActiveCam(cam)}
              style={{ 
                cursor: 'pointer', 
                border: '1px solid #1E2D3D', 
                borderRadius: 8, 
                overflow: 'hidden', 
                opacity: 0.6,
                transition: 'opacity 0.2s'
              }}
              onMouseEnter={e => e.currentTarget.style.opacity = '1'}
              onMouseLeave={e => e.currentTarget.style.opacity = '0.6'}
            >
              {/* Passing empty detections to thumbnails for static mock render */}
              <CameraFeed detections={cam === 'CAM-01' ? detections : []} cameraId={cam} hideOverlay />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
