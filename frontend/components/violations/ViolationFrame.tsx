'use client'
import { useState } from 'react'

interface Props {
  violationId: string
  hasFrame: boolean
  frameUrl?: string
  size?: 'thumb' | 'full'
  className?: string
}

export function ViolationFrame({ violationId, hasFrame, frameUrl, size = 'full', className }: Props) {
  const [error, setError] = useState(false)

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

  if (!hasFrame || !frameUrl) {
    return (
      <div style={{ ...containerStyle, background: '#0D1117', color: '#64748B' }} className={className}>
        {size === 'thumb' ? '-' : 'Frame tidak tersedia'}
      </div>
    )
  }

  if (error) {
    return (
      <div style={{ ...containerStyle, background: 'rgba(239,68,68,0.1)', color: '#EF4444' }} className={className}>
        {size === 'thumb' ? '!' : 'Gagal memuat frame'}
      </div>
    )
  }

  if (size === 'thumb') {
    return (
      <img
        src={frameUrl}
        alt="frame"
        onError={() => setError(true)}
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
      src={frameUrl}
      alt={`Frame violation ${violationId}`}
      onError={() => setError(true)}
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
