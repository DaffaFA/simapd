'use client'
import { useState } from 'react'
import { CameraStreamCanvas } from './CameraStreamCanvas'
import type { FrameMessage } from '@/src/lib/useWebSocket'

interface Props {
  latestFrames: Map<string, FrameMessage>
  availableCameras?: string[]   // list camera dari GET /stream/cameras
}

export function CameraGrid({ latestFrames, availableCameras = [] }: Props) {
  const [focused, setFocused] = useState<string | null>(null)

  // Prioritas: kamera yang sudah ada frame-nya DULU, baru yang dari DB
  const activeCameras  = Array.from(latestFrames.keys())
  const dbOnlyCameras  = availableCameras.filter(id => !latestFrames.has(id))
  const allCameraIds   = [...activeCameras, ...dbOnlyCameras]

  // ── DEBUG ──────────────────────────────────────────────────────────────────
  if (typeof window !== 'undefined' && (window as any)._simapd_ws_debug) {
    console.log('[CameraGrid] activeCameras:', activeCameras)
    console.log('[CameraGrid] dbOnlyCameras:', dbOnlyCameras)
  }

  if (allCameraIds.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-gray-400">
        <div className="text-5xl mb-4">📹</div>
        <p className="text-lg font-medium">Tidak ada kamera aktif</p>
        <p className="text-sm mt-1 text-center">
          Jalankan AI service dalam DEMO_MODE=true,<br/>
          atau hubungkan kamera RTSP
        </p>
      </div>
    )
  }

  // Mode fokus: satu kamera fullscreen
  if (focused) {
    return (
      <div className="space-y-3">
        <button onClick={() => setFocused(null)}
          className="text-sm text-gray-400 hover:text-white flex items-center gap-1">
          ← Semua Kamera ({allCameraIds.length})
        </button>
        <CameraStreamCanvas
          cameraId={focused}
          latestFrame={latestFrames.get(focused)}
          className="w-full"
          showLabels={true}
        />
      </div>
    )
  }

  // Grid mode: semua kamera dalam grid
  const cols = allCameraIds.length === 1 ? 'grid-cols-1'
             : allCameraIds.length <= 2  ? 'grid-cols-2'
             : allCameraIds.length <= 4  ? 'grid-cols-2'
             : 'grid-cols-2 lg:grid-cols-3'

  return (
    <div className={`grid gap-3 ${cols}`}>
      {allCameraIds.map(camId => (
        <div key={camId} onClick={() => setFocused(camId)}
          className="cursor-pointer group">
          <CameraStreamCanvas
            cameraId={camId}
            latestFrame={latestFrames.get(camId)}
            className="w-full group-hover:ring-2 group-hover:ring-blue-500 transition-all"
            showLabels={true}
          />
        </div>
      ))}
    </div>
  )
}
