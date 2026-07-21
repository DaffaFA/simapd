'use client'
import { useEffect, useRef, useState, useCallback } from 'react'

// ── Helper: bangun URL WebSocket yang valid ──────────────────────────────────
function buildWsUrl(token: string): string {
  const raw = process.env.NEXT_PUBLIC_WS_URL ?? ''

  if (!raw) {
    // Fallback: derive dari window.location saat runtime
    if (typeof window === 'undefined') return ''
    const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const host  = window.location.host                    // "localhost:3000" atau domain
    // Jika Next.js dan NestJS di port berbeda, ini tidak akan benar —
    // tapi ini adalah fallback last resort
    console.warn('[WS] NEXT_PUBLIC_WS_URL tidak diset! Gunakan NEXT_PUBLIC_WS_URL di .env.local')
    return `${proto}//${host}/stream?token=${token}`
  }

  // Normalisasi protokol: http → ws, https → wss
  let url = raw.trim().replace(/\/$/, '')   // hapus trailing slash
  if (url.startsWith('http://'))  url = url.replace('http://', 'ws://')
  if (url.startsWith('https://')) url = url.replace('https://', 'wss://')
  if (!url.startsWith('ws'))      url = `ws://${url}`   // tambah ws:// jika tidak ada

  return `${url}/stream?token=${token}`
}

// ── Types ────────────────────────────────────────────────────────────────────
export interface FrameMessage {
  event:      'frame'
  camera_id:  string
  frame_b64:  string
  width:      number
  height:     number
  detections: FrameDetection[]
  timestamp:  string
}

export interface FrameDetection {
  track_id:     number
  bbox:         [number, number, number, number]
  helm_color:   string
  role_label:   string
  is_compliant: boolean
  missing_ppe:  string[]
  confidence?:  number
}

export function useWebSocket() {
  const [isConnected,    setIsConnected]    = useState(false)
  const [recentAlerts,   setRecentAlerts]   = useState<any[]>([])
  const [lastDetections, setLastDetections] = useState<any[]>([])
  const [latestFrames,   setLatestFrames]   = useState<Map<string, FrameMessage>>(new Map())
  const [wsError,        setWsError]        = useState<string | null>(null)

  const wsRef        = useRef<WebSocket | null>(null)
  const reconnectRef = useRef<ReturnType<typeof setTimeout>>()
  const retryCount   = useRef(0)

  const connect = useCallback(() => {
    // Jangan connect jika sudah ada koneksi yang open
    if (wsRef.current?.readyState === WebSocket.OPEN) return

    const token = localStorage.getItem('simapd_token') // USING simapd_token based on earlier checks
    if (!token) {
      setWsError('Tidak ada token — login dulu')
      return
    }

    const wsUrl = buildWsUrl(token)
    console.log(`[WS] Connecting to: ${wsUrl.replace(/token=.{20}.*/, 'token=***')}`)

    let ws: WebSocket
    try {
      ws = new WebSocket(wsUrl)
    } catch (err) {
      console.error('[WS] Failed to create WebSocket:', err)
      setWsError(`Invalid WebSocket URL: ${wsUrl}`)
      return
    }

    wsRef.current = ws

    ws.onopen = () => {
      console.log('[WS] Connected ✓')
      setIsConnected(true)
      setWsError(null)
      retryCount.current = 0
    }

    ws.onmessage = (event) => {
      let msg: any
      try {
        msg = JSON.parse(event.data as string)
      } catch {
        return
      }

      // ── DEBUG LOGGING (hapus setelah masalah selesai) ──────────────────────
      if (typeof window !== 'undefined' && (window as any)._simapd_ws_debug) {
        if (msg.event === 'frame') {
          console.log(`[WS] frame | camera=${msg.camera_id} | dets=${msg.detections?.length} | size=${(event.data as string).length}`)
        } else {
          console.log(`[WS] event=${msg.event}`)
        }
      }
      // ─────────────────────────────────────────────────────────────────────────

      if (msg.event === 'frame') {
        setLatestFrames(prev => {
          const next = new Map(prev)
          next.set(msg.camera_id, msg)
          // ── DEBUG: log map state ──────────────────────────────────────────────
          if (typeof window !== 'undefined' && (window as any)._simapd_ws_debug) {
            console.log(`[WS] latestFrames updated: cameras=[${Array.from(next.keys()).join(', ')}]`)
          }
          return next
        })
        return
      }

      if (msg.event === 'detection') {
        setLastDetections(prev =>
          [...prev.filter(d =>
            d.track_id !== msg.track_id || d.camera_id !== msg.camera_id
          ), msg].slice(-50)
        )
        return
      }

      if (msg.event === 'violation_alert') {
        setRecentAlerts(prev => [msg, ...prev].slice(0, 20))
        return
      }

      if (msg.event === 'error') {
        console.warn('[WS] Server error:', msg.message)
        setWsError(msg.message)
      }
    }

    ws.onclose = (evt) => {
      console.log(`[WS] Closed: code=${evt.code} reason="${evt.reason}"`)
      setIsConnected(false)

      // Log yang lebih informatif berdasarkan close code
      if (evt.code === 1008) setWsError('Unauthorized — cek token JWT')
      else if (evt.code === 1011) setWsError('Server error — cek NestJS logs')

      // Exponential backoff: 2s, 4s, 8s, max 16s
      const delay = Math.min(2000 * Math.pow(2, retryCount.current), 16000)
      retryCount.current += 1
      console.log(`[WS] Reconnecting dalam ${delay}ms (attempt ${retryCount.current})`)
      reconnectRef.current = setTimeout(connect, delay)
    }

    ws.onerror = (err) => {
      console.error('[WS] Error:', err)
      // onerror selalu diikuti onclose, jadi reconnect ditangani di onclose
    }
  }, [])

  useEffect(() => {
    connect()
    return () => {
      clearTimeout(reconnectRef.current)
      wsRef.current?.close(1000, 'Component unmounted')
    }
  }, [connect])

  return { isConnected, connected: isConnected, recentAlerts, lastDetections, latestFrames, wsError }
}
