'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import { DetectionMsg, ViolationAlertMsg, WSMessage } from '../types/simapd'

const WS_URL = process.env.NEXT_PUBLIC_WS_URL ?? 'ws://localhost:3001'

export interface UseWSOptions {
  onDetection?:     (msg: DetectionMsg) => void
  onViolationAlert?: (msg: ViolationAlertMsg) => void
  reconnectMs?:     number
}

export function useWebSocket(opts: UseWSOptions = {}) {
  const [connected, setConnected] = useState(false)
  const [recentAlerts, setAlerts]  = useState<ViolationAlertMsg[]>([])
  const [lastDetections, setDets]  = useState<DetectionMsg[]>([])
  const wsRef    = useRef<WebSocket | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout>>()

  const connect = useCallback(() => {
    if (typeof window === 'undefined') return
    const token = localStorage.getItem('simapd_token')
    if (!token) return
    const ws = new WebSocket(`${WS_URL}/stream?token=${token}`)
    ws.onopen    = () => { setConnected(true); clearTimeout(timerRef.current) }
    ws.onclose   = () => { setConnected(false); timerRef.current = setTimeout(connect, opts.reconnectMs??3000) }
    ws.onerror   = () => ws.close()
    ws.onmessage = ({ data }) => {
      try {
        const msg: WSMessage = JSON.parse(data)
        if (msg.event === 'detection') {
          setDets(prev => [msg as DetectionMsg, ...prev].slice(0, 50))
          opts.onDetection?.(msg as DetectionMsg)
        } else if (msg.event === 'violation_alert') {
          setAlerts(prev => [msg as ViolationAlertMsg, ...prev].slice(0, 20))
          opts.onViolationAlert?.(msg as ViolationAlertMsg)
        }
      } catch {}
    }
    wsRef.current = ws
  }, [])

  useEffect(() => {
    connect()
    return () => { clearTimeout(timerRef.current); wsRef.current?.close() }
  }, [connect])

  return { connected, recentAlerts, lastDetections }
}
