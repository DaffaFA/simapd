'use client'
import { useEffect, useState } from 'react'
import { fetchViolationFrame } from '@/src/lib/api'

interface Props {
  violationId: string
  hasFrame: boolean
  size?: 'thumb' | 'full'
  className?: string
}

export function ViolationFrame({ violationId, hasFrame, size = 'full', className }: Props) {
  const [src, setSrc] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(false)

  useEffect(() => {
    if (!hasFrame) return
    setLoading(true)
    fetchViolationFrame(violationId)
      .then(url => { setSrc(url); setError(!url) })
      .catch(() => setError(true))
      .finally(() => setLoading(false))

    // Cleanup blob URL saat unmount
    return () => { if (src) URL.revokeObjectURL(src) }
  }, [violationId, hasFrame])

  const containerStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 6,
    border: '1px solid #1E2D3D',
    fontSize: 12,
    fontFamily: 'DM Sans, sans-serif',
    width: size === 'thumb' ? 40 : '100%',
    height: size === 'thumb' ? 40 : 192,
  }

  if (!hasFrame) {
    return (
      <div style={{ ...containerStyle, background: '#0D1117', color: '#64748B' }} className={className}>
        {size === 'thumb' ? '—' : 'Frame tidak tersedia'}
      </div>
    )
  }

  if (loading) {
    return (
      <div style={{ ...containerStyle, background: 'rgba(255,255,255,0.05)', color: '#64748B' }} className={className}>
        {size === 'thumb' ? '...' : 'Memuat frame...'}
      </div>
    )
  }

  if (error || !src) {
    return (
      <div style={{ ...containerStyle, background: 'rgba(239,68,68,0.1)', color: '#EF4444' }} className={className}>
        {size === 'thumb' ? '!' : 'Gagal memuat frame'}
      </div>
    )
  }

  if (size === 'thumb') {
    return (
      <img
        src={src}
        alt="frame"
        style={{
          width: 40,
          height: 40,
          objectFit: 'cover',
          borderRadius: 6,
          border: '1px solid #1E2D3D',
          cursor: 'pointer'
        }}
        className={className}
      />
    )
  }

  return (
    <img
      src={src}
      alt={`Frame violation ${violationId}`}
      style={{
        width: '100%',
        maxHeight: 384,
        objectFit: 'contain',
        borderRadius: 8,
        border: '1px solid #1E2D3D',
        background: '#000'
      }}
      className={className}
    />
  )
}
