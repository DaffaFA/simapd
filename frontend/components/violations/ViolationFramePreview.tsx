'use client'
import { useState, useEffect } from 'react'
import { fetchViolationFrame } from '@/src/lib/api'

interface Props {
  violationId: string
  className?: string
}

/**
 * Fetches and renders a violation frame via the authenticated API endpoint.
 * Uses an object URL so auth headers are properly sent.
 */
export function ViolationFramePreview({ violationId, className }: Props) {
  const [src, setSrc]       = useState<string | null>(null)
  const [error, setError]   = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let objectUrl: string | null = null
    setLoading(true)
    setError(false)
    setSrc(null)

    fetchViolationFrame(violationId)
      .then(url => {
        if (!url) throw new Error('no frame')
        objectUrl = url
        setSrc(objectUrl)
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false))

    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [violationId])

  if (loading) {
    return (
      <div className={`flex items-center justify-center w-full h-40 bg-gray-900 rounded-lg text-gray-500 text-xs ${className ?? ''}`}>
        Memuat...
      </div>
    )
  }

  if (error || !src) {
    return (
      <div className={`flex items-center justify-center w-full h-40 bg-gray-900 rounded-lg text-gray-500 text-xs ${className ?? ''}`}>
        Frame tidak tersedia
      </div>
    )
  }

  return (
    <img
      src={src}
      alt={`Frame violation ${violationId}`}
      className={`w-full max-h-64 object-contain rounded-lg border border-gray-800 bg-black ${className ?? ''}`}
    />
  )
}
