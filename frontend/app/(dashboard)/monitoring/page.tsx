'use client'
import { useEffect, useState } from 'react'
import { useWebSocket } from '@/src/lib/useWebSocket'
import { CameraGrid } from '@/components/stream/CameraGrid'

// Fetch daftar kamera dari API
async function fetchCameras(): Promise<string[]> {
  try {
    const token = localStorage.getItem('simapd_token')
    const res   = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/stream/cameras`,
      { headers: { Authorization: `Bearer ${token}` } }
    )
    const data = await res.json()
    return (data as { camera_id: string }[]).map(c => c.camera_id)
  } catch {
    return []
  }
}

export default function MonitoringPage() {
  const { isConnected, latestFrames, recentAlerts, wsError } = useWebSocket()
  const [cameras, setCameras] = useState<string[]>([])

  useEffect(() => {
    fetchCameras().then(setCameras)
  }, [])

  // ── DEBUG: log saat latestFrames berubah ─────────────────────────────────
  useEffect(() => {
    if (latestFrames.size > 0) {
      if (typeof window !== 'undefined' && (window as any)._simapd_ws_debug) {
        console.log('[Page] latestFrames:', Array.from(latestFrames.keys()))
      }
    }
  }, [latestFrames])

  return (
    <div className="p-6 space-y-6">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Monitoring Live</h1>
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${
            isConnected ? 'bg-green-500 animate-pulse' : 'bg-red-400'
          }`}/>
          <span className="text-sm text-gray-500">
            {isConnected
              ? `Live · ${latestFrames.size} stream`
              : wsError ?? 'Menghubungkan...'}
          </span>
        </div>
      </div>

      {/* Error banner - tampil jika ada WS error */}
      {wsError && !isConnected && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
          <span className="text-red-500 mt-0.5">⚠</span>
          <div>
            <p className="text-sm font-medium text-red-800">WebSocket Error</p>
            <p className="text-xs text-red-600">{wsError}</p>
            <p className="text-xs text-red-400 mt-1">
              Cek: NEXT_PUBLIC_WS_URL di .env.local · NestJS logs · NGINX config
            </p>
          </div>
        </div>
      )}

      {/* ── Camera Grid ────────────────────────────────────────────────────── */}
      <div className="bg-gray-950 rounded-xl p-4">
        <CameraGrid
          latestFrames={latestFrames}
          availableCameras={cameras}
        />
      </div>

      {/* ── Recent Alerts ──────────────────────────────────────────────────── */}
      {recentAlerts.length > 0 && (
        <div>
          <h2 className="text-lg font-medium mb-3">Alert Terkini</h2>
          <div className="space-y-2">
            {recentAlerts.slice(0, 5).map((alert, i) => (
              <div key={i}
                className="flex items-center gap-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                <span className="text-red-500 text-lg">⚠</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-red-800">
                    {alert.violation_code} - {alert.camera_id}
                  </p>
                  <p className="text-xs text-red-600">
                    APD hilang: {(alert.missing_ppe ?? []).join(', ')} ·{' '}
                    Track #{alert.track_id} ·{' '}
                    {new Date(alert.timestamp).toLocaleTimeString('id-ID')}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
