'use client'
import { useEffect, useRef } from 'react'
import type { FrameMessage, FrameDetection } from '@/src/lib/useWebSocket'

interface Props {
  cameraId:    string
  latestFrame: FrameMessage | undefined
  className?:  string
  showLabels?: boolean   // default true
}

// Warna untuk tiap status
const COLORS = {
  compliant:   '#22c55e',   // green-500
  violation:   '#ef4444',   // red-500
  helm: {
    Kuning: '#FCD34D',
    Putih:  '#F3F4F6',
    Hijau:  '#4ADE80',
    Unknown: '#9CA3AF',
  } as Record<string, string>,
}

function drawOverlay(
  ctx:        CanvasRenderingContext2D,
  detections: FrameDetection[],
  showLabels: boolean,
) {
  ctx.save()
  ctx.font         = 'bold 12px system-ui, sans-serif'
  ctx.textBaseline = 'bottom'
  ctx.lineWidth    = 2

  for (const det of detections) {
    const [x1, y1, x2, y2] = det.bbox
    const bw     = x2 - x1
    const bh     = y2 - y1
    const color  = det.is_compliant ? COLORS.compliant : COLORS.violation

    // ── Bounding box ─────────────────────────────────────────────────────
    ctx.strokeStyle = color
    ctx.strokeRect(x1, y1, bw, bh)

    // ── Helm color dot (kanan atas bbox) ─────────────────────────────────
    const helmColor = COLORS.helm[det.helm_color] ?? COLORS.helm.Unknown
    ctx.fillStyle   = helmColor
    ctx.beginPath()
    ctx.arc(x2 - 8, y1 + 8, 6, 0, Math.PI * 2)
    ctx.fill()
    ctx.strokeStyle = 'rgba(0,0,0,0.5)'
    ctx.lineWidth   = 1
    ctx.stroke()
    ctx.lineWidth   = 2

    if (!showLabels) continue

    // ── Label text (track ID + role/status) ─────────────────────────────────
    const statusText = det.is_compliant
      ? `${det.role_label}`
      : det.missing_ppe.length > 0
        ? `✗ ${det.missing_ppe.join(', ')}`
        : '✗ Pelanggaran'
    const text = `#${det.track_id} · ${statusText}`

    const metrics    = ctx.measureText(text)
    const labelW     = metrics.width + 10
    const labelH     = 18
    const labelX     = x1
    const labelY     = y1 - labelH

    // Label background
    ctx.fillStyle = color
    ctx.fillRect(labelX, labelY, labelW, labelH)

    // Label text
    ctx.fillStyle = '#fff'
    ctx.fillText(text, labelX + 5, labelY + labelH - 2)
  }

  ctx.restore()
}

export function CameraStreamCanvas({ cameraId, latestFrame, className, showLabels = true }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const imgRef    = useRef<HTMLImageElement | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !latestFrame) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Update canvas size jika frame dimensions berubah
    if (canvas.width !== latestFrame.width) canvas.width   = latestFrame.width
    if (canvas.height !== latestFrame.height) canvas.height = latestFrame.height

    // Reuse atau buat Image element
    if (!imgRef.current) imgRef.current = new Image()
    const img = imgRef.current

    img.onload = () => {
      // Clear dan draw frame
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      ctx.drawImage(img, 0, 0)

      // Draw detections overlay setelah frame selesai di-draw
      drawOverlay(ctx, latestFrame.detections, showLabels)
    }

    img.src = `data:image/jpeg;base64,${latestFrame.frame_b64}`

  }, [latestFrame, showLabels])

  // Tampilan saat belum ada frame
  if (!latestFrame) {
    return (
      <div className={`flex flex-col items-center justify-center bg-gray-900 rounded-lg
                       aspect-video text-gray-500 ${className ?? ''}`}>
        <div className="text-3xl mb-2">📷</div>
        <p className="text-sm">{cameraId}</p>
        <p className="text-xs mt-1 text-gray-600">Menunggu stream...</p>
        <div className="mt-3 flex gap-1">
          <span className="w-1.5 h-1.5 bg-gray-600 rounded-full animate-bounce"
                style={{ animationDelay: '0ms' }}/>
          <span className="w-1.5 h-1.5 bg-gray-600 rounded-full animate-bounce"
                style={{ animationDelay: '150ms' }}/>
          <span className="w-1.5 h-1.5 bg-gray-600 rounded-full animate-bounce"
                style={{ animationDelay: '300ms' }}/>
        </div>
      </div>
    )
  }

  const nonCompliant = latestFrame.detections.filter(d => !d.is_compliant).length
  const total        = latestFrame.detections.length

  return (
    <div className={`relative bg-black rounded-lg overflow-hidden ${className ?? ''}`}>
      {/* Canvas utama */}
      <canvas
        ref={canvasRef}
        className="w-full h-full object-contain"
        style={{ display: 'block' }}
      />

      {/* Overlay status bar (kanan bawah) */}
      <div className="absolute bottom-2 right-2 flex gap-2">
        {nonCompliant > 0 && (
          <span className="px-2 py-0.5 bg-red-500/90 text-white text-xs rounded-full font-medium
                           animate-pulse">
            ⚠ {nonCompliant} pelanggaran
          </span>
        )}
        <span className={`px-2 py-0.5 text-white text-xs rounded-full
                         ${total > 0 ? 'bg-blue-500/80' : 'bg-gray-500/80'}`}>
          {total} orang
        </span>
      </div>

      {/* Camera ID label (kiri atas) */}
      <div className="absolute top-2 left-2">
        <span className="px-2 py-0.5 bg-black/60 text-white text-xs rounded font-mono">
          {cameraId}
        </span>
      </div>
    </div>
  )
}
