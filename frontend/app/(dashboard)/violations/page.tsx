'use client'
import { useState, useEffect, useCallback, useRef } from 'react'
import { apiFetch, rejectViolation, confirmViolation, getViolationFrameUrl } from '@/src/lib/api'
import { groupViolationsByBatch, formatBatchTime, type RawViolation } from '@/src/lib/group-violations'
import { LinkPersonnelPanel }    from '@/components/violations/LinkPersonnelPanel'
import { ViolationFramePreview } from '@/components/violations/ViolationFramePreview'
import {
  Pagination, PaginationContent, PaginationItem,
  PaginationLink, PaginationNext, PaginationPrevious,
  PaginationEllipsis,
} from '@/components/ui/pagination'
import { cn }       from '@/lib/utils'
import { useAuth }  from '@/src/lib/AuthContext'
import { EDITOR_ROLES, hasRole } from '@/src/lib/roles'

const PAGE_SIZE  = 20
const REFRESH_MS = 5000  // 5 detik

// ── Types ─────────────────────────────────────────────────────────────────────
type Violation = RawViolation

// ── Modal Reject ──────────────────────────────────────────────────────────────
function RejectModal({
  violation,
  onConfirm,
  onCancel,
}: {
  violation: Violation
  onConfirm: (reason: string) => Promise<void>
  onCancel:  () => void
}) {
  const [reason, setReason] = useState('')
  const [saving, setSaving] = useState(false)

  const handleSubmit = async () => {
    setSaving(true)
    try { await onConfirm(reason) }
    finally { setSaving(false) }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.6)' }}
      onClick={onCancel}
    >
      <div
        className="rounded-xl shadow-2xl w-full max-w-md mx-4 p-6"
        style={{ background: '#111827', border: '1px solid #1E2D3D' }}
        onClick={e => e.stopPropagation()}
      >
        <h3 style={{ color: '#E2E8F0', fontFamily: 'DM Sans, sans-serif', fontWeight: 700, fontSize: 16, marginBottom: 4 }}>
          Reject Violation
        </h3>
        <p style={{ color: '#64748B', fontFamily: 'JetBrains Mono, monospace', fontSize: 12, marginBottom: 16 }}>
          {violation.violation_code}
        </p>
        <label style={{ display: 'block', marginBottom: 16 }}>
          <span style={{ display: 'block', fontSize: 12, color: '#94A3B8', marginBottom: 6, fontFamily: 'DM Sans, sans-serif' }}>
            Alasan reject (opsional)
          </span>
          <textarea
            value={reason}
            onChange={e => setReason(e.target.value)}
            placeholder="Contoh: False positive, bukan area kerja, dsb."
            rows={3}
            style={{
              width: '100%', padding: '8px 12px', fontSize: 13,
              fontFamily: 'DM Sans, sans-serif',
              background: '#0D1117', border: '1px solid #1E2D3D',
              borderRadius: 8, color: '#E2E8F0', resize: 'none', outline: 'none',
            }}
          />
        </label>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button
            onClick={onCancel}
            style={{
              padding: '8px 16px', fontSize: 13, borderRadius: 8,
              border: '1px solid #1E2D3D', background: 'transparent',
              color: '#94A3B8', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif',
            }}
          >
            Batal
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving}
            style={{
              padding: '8px 16px', fontSize: 13, borderRadius: 8,
              background: saving ? 'rgba(239,68,68,0.5)' : '#EF4444',
              color: '#fff', border: 'none', cursor: saving ? 'not-allowed' : 'pointer',
              fontFamily: 'DM Sans, sans-serif', fontWeight: 600,
            }}
          >
            {saving ? 'Menyimpan...' : 'Reject Violation'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Link + Frame Modal ─────────────────────────────────────────────────────────
function LinkViolationModal({
  violation,
  onClose,
  onLinked,
}: {
  violation: Violation
  onClose:   () => void
  onLinked:  () => void
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.7)' }}
      onClick={onClose}
    >
      <div
        style={{
          background: '#111827', border: '1px solid #1E2D3D',
          borderRadius: 16, width: '100%', maxWidth: 760, maxHeight: '90vh',
          overflow: 'hidden', display: 'flex', flexDirection: 'column',
          boxShadow: '0 25px 50px -12px rgba(0,0,0,0.6)',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', borderBottom: '1px solid #1E2D3D' }}>
          <div>
            <h3 style={{ fontSize: 15, fontFamily: 'DM Sans, sans-serif', fontWeight: 700, color: '#E2E8F0', margin: 0 }}>
              Tautan Karyawan
            </h3>
            <p style={{ fontSize: 11, fontFamily: 'JetBrains Mono, monospace', color: '#64748B', margin: '2px 0 0' }}>
              {violation.violation_code}
            </p>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'transparent', border: 'none', color: '#64748B', cursor: 'pointer', width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 8, fontSize: 18 }}
          >✕</button>
        </div>
        {/* Body */}
        <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
          {/* Frame */}
          <div style={{ width: '40%', background: '#0A0E14', padding: 16, borderRight: '1px solid #1E2D3D', display: 'flex', flexDirection: 'column' }}>
            <p style={{ fontSize: 10, fontWeight: 600, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8, fontFamily: 'DM Sans, sans-serif' }}>
              Frame
            </p>
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <ViolationFramePreview violationId={violation.id} />
            </div>
            <div style={{ marginTop: 12, display: 'flex', flexWrap: 'wrap', gap: 4 }}>
              {violation.missing_helm  && <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 4, background: 'rgba(239,68,68,0.15)', color: '#F87171' }}>✗ Helm</span>}
              {violation.missing_vest  && <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 4, background: 'rgba(239,68,68,0.15)', color: '#F87171' }}>✗ Rompi</span>}
              {violation.missing_shoes && <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 4, background: 'rgba(239,68,68,0.15)', color: '#F87171' }}>✗ Sepatu</span>}
            </div>
          </div>
          {/* Link panel */}
          <div style={{ flex: 1, overflowY: 'auto', padding: 20 }}>
            <LinkPersonnelPanel
              violationId={violation.id}
              onLinked={onLinked}
            />
          </div>
        </div>
      </div>
    </div>
  )
}

// ── StatusBadge ────────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: Violation['status'] }) {
  const map: Record<string, { bg: string; color: string; label: string }> = {
    pending:   { bg: 'rgba(234,179,8,0.15)',  color: '#EAB308', label: 'Pending'       },
    confirmed: { bg: 'rgba(34,197,94,0.15)',  color: '#22C55E', label: 'Dikonfirmasi'  },
    rejected:  { bg: 'rgba(239,68,68,0.15)',  color: '#EF4444', label: 'Ditolak'       },
  }
  const s = map[status] ?? map.pending
  return (
    <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 4, background: s.bg, color: s.color, fontWeight: 600, fontFamily: 'DM Sans, sans-serif' }}>
      {s.label}
    </span>
  )
}

// ── Komponen utama ─────────────────────────────────────────────────────────────
export default function ViolationsPage() {
  const { user }  = useAuth()
  const canEdit   = hasRole(user?.role, EDITOR_ROLES)

  // State
  const [violations,      setViolations]      = useState<Violation[]>([])
  const [total,           setTotal]           = useState(0)
  const [page,            setPage]            = useState(1)
  const [loading,         setLoading]         = useState(true)
  const [showRejected,    setShowRejected]    = useState(false)
  const [linkingViol,     setLinkingViol]     = useState<Violation | null>(null)
  const [rejectingViol,   setRejectingViol]   = useState<Violation | null>(null)
  const [expandedBatches, setExpandedBatches] = useState<Set<string>>(new Set())

  // Auto-refresh
  const [countdown,    setCountdown]    = useState(REFRESH_MS / 1000)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const timerRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined)
  const countRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined)

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  // ── Fetch violations ─────────────────────────────────────────────────────────
  const fetchViolations = useCallback(async (silent = false) => {
    if (!silent) setLoading(true)
    else setIsRefreshing(true)
    try {
      const params = new URLSearchParams({
        page:      String(page),
        page_size: String(PAGE_SIZE),
        ...(showRejected ? {} : { exclude_status: 'rejected' }),
      })
      const res = await apiFetch<{ items: Violation[]; total: number }>(
        `/violations?${params}`
      )
      setViolations(res.items ?? [])
      setTotal(res.total ?? 0)
    } catch { /* ignore */ }
    finally { setLoading(false); setIsRefreshing(false) }
  }, [page, showRejected])

  // Initial load + page change
  useEffect(() => { fetchViolations() }, [fetchViolations])

  // Auto-refresh every 5 seconds
  useEffect(() => {
    countRef.current = setInterval(() => {
      setCountdown(c => (c <= 1 ? REFRESH_MS / 1000 : c - 1))
    }, 1000)

    timerRef.current = setInterval(() => {
      setCountdown(REFRESH_MS / 1000)
      fetchViolations(true)
    }, REFRESH_MS)

    return () => {
      clearInterval(countRef.current)
      clearInterval(timerRef.current)
    }
  }, [fetchViolations])

  // ── Batch grouping ───────────────────────────────────────────────────────────
  const batches = groupViolationsByBatch(violations)

  const toggleBatch = (key: string) =>
    setExpandedBatches(prev => {
      const next = new Set(prev)
      next.has(key) ? next.delete(key) : next.add(key)
      return next
    })

  // Default: all batches expanded
  useEffect(() => {
    setExpandedBatches(new Set(batches.map(b => b.key)))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [violations.length])

  // ── Handlers ─────────────────────────────────────────────────────────────────
  const handleReject = async (violation: Violation, reason: string) => {
    await rejectViolation(violation.id, reason)
    setRejectingViol(null)
    fetchViolations(true)
  }

  const handleConfirm = async (violation: Violation) => {
    await confirmViolation(violation.id)
    fetchViolations(true)
  }

  // ── Download frame ────────────────────────────────────────────────────────────
  const downloadFrame = async (violationId: string) => {
    const token = localStorage.getItem('simapd_token') ?? ''
    const res   = await fetch(getViolationFrameUrl(violationId), {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!res.ok) return
    const a  = document.createElement('a')
    a.href   = URL.createObjectURL(await res.blob())
    a.target = '_blank'
    a.click()
    setTimeout(() => URL.revokeObjectURL(a.href), 1000)
  }

  // ── Pagination helper ─────────────────────────────────────────────────────────
  const pageNumbers = Array.from({ length: totalPages }, (_, i) => i + 1)
    .filter(n => n === 1 || n === totalPages || Math.abs(n - page) <= 1)
    .reduce<(number | '...')[]>((acc, n, idx, arr) => {
      if (idx > 0 && n - (arr[idx - 1] as number) > 1) acc.push('...')
      acc.push(n)
      return acc
    }, [])

  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: '#E2E8F0', fontFamily: 'DM Sans, sans-serif', margin: 0 }}>
          Manajemen Pelanggaran APD
        </h1>

        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          {/* Toggle show rejected */}
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#94A3B8', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}>
            <input
              type="checkbox"
              checked={showRejected}
              onChange={e => { setShowRejected(e.target.checked); setPage(1) }}
              style={{ width: 14, height: 14, cursor: 'pointer' }}
            />
            Tampilkan yang ditolak
          </label>

          {/* Auto-refresh indicator */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#64748B', fontFamily: 'DM Sans, sans-serif' }}>
            <span style={{
              display: 'inline-block', width: 8, height: 8, borderRadius: '50%',
              background: isRefreshing ? '#3B82F6' : '#334155',
              animation: isRefreshing ? 'pulse 1s infinite' : 'none',
            }} />
            <span>Refresh dalam {countdown}d</span>
            <button
              onClick={() => { setCountdown(REFRESH_MS / 1000); fetchViolations(true) }}
              style={{ background: 'transparent', border: 'none', color: '#3B82F6', cursor: 'pointer', fontSize: 16, padding: '0 2px' }}
              title="Refresh sekarang"
            >↻</button>
          </div>
        </div>
      </div>

      {/* ── Batch groups ───────────────────────────────────────────────────── */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: '#64748B', fontFamily: 'DM Sans, sans-serif', fontSize: 14 }}>
          Memuat...
        </div>
      ) : batches.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: '#64748B', fontFamily: 'DM Sans, sans-serif', fontSize: 14 }}>
          Tidak ada pelanggaran
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {batches.map(batch => {
            const isExpanded = expandedBatches.has(batch.key)
            const rejCount   = batch.violations.filter(v => v.status === 'rejected').length
            const pendCount  = batch.violations.filter(v => v.status === 'pending').length

            return (
              <div key={batch.key} style={{ border: '1px solid #1E2D3D', borderRadius: 12, overflow: 'hidden', background: '#111827' }}>

                {/* Batch header */}
                <button
                  onClick={() => toggleBatch(batch.key)}
                  style={{
                    width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '12px 20px', background: '#0D1117', border: 'none', cursor: 'pointer',
                    textAlign: 'left', transition: 'background 0.15s',
                  }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#131C2A' }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = '#0D1117' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span style={{
                      color: '#64748B', fontSize: 10,
                      transform: isExpanded ? 'rotate(90deg)' : 'none',
                      transition: 'transform 0.15s', display: 'inline-block',
                    }}>▶</span>
                    <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, background: '#1E2D3D', color: '#94A3B8', padding: '2px 8px', borderRadius: 4 }}>
                      {batch.camera_id}
                    </span>
                    <span style={{ fontSize: 13, color: '#94A3B8', fontFamily: 'DM Sans, sans-serif' }}>
                      {formatBatchTime(batch.start_time, batch.end_time)}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {pendCount > 0 && <span style={{ fontSize: 11, background: 'rgba(234,179,8,0.15)', color: '#EAB308', padding: '2px 8px', borderRadius: 12 }}>{pendCount} pending</span>}
                    {rejCount  > 0 && <span style={{ fontSize: 11, background: 'rgba(239,68,68,0.15)', color: '#EF4444', padding: '2px 8px', borderRadius: 12 }}>{rejCount} ditolak</span>}
                    {batch.violations.some(v => v.frame_key) && (
                      <span style={{ fontSize: 11, background: 'rgba(59,130,246,0.15)', color: '#3B82F6', padding: '2px 8px', borderRadius: 12 }}>📷</span>
                    )}
                    <span style={{ fontSize: 13, fontWeight: 600, color: '#64748B', fontFamily: 'DM Sans, sans-serif' }}>
                      {batch.violations.length} pelanggaran
                    </span>
                  </div>
                </button>

                {/* Violation rows */}
                {isExpanded && (
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid #1E2D3D' }}>
                        {['Kode', 'APD Hilang', 'Shift', 'Status', 'Waktu', 'Frame', 'Karyawan', ...(canEdit ? ['Aksi'] : [])].map(col => (
                          <th key={col} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 10, fontFamily: 'DM Sans, sans-serif', fontWeight: 600, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.08em', whiteSpace: 'nowrap' }}>
                            {col}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {batch.violations.map(v => (
                        <tr
                          key={v.id}
                          style={{
                            borderBottom: '1px solid #0D1117',
                            background: v.status === 'rejected' ? 'rgba(239,68,68,0.04)' : 'transparent',
                            opacity: v.status === 'rejected' ? 0.65 : 1,
                            transition: 'background 0.15s',
                          }}
                          onMouseEnter={e => { if (v.status !== 'rejected') (e.currentTarget as HTMLElement).style.background = 'rgba(59,130,246,0.04)' }}
                          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = v.status === 'rejected' ? 'rgba(239,68,68,0.04)' : 'transparent' }}
                        >
                          <td style={{ padding: '10px 14px' }}>
                            <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: '#F97316' }}>{v.violation_code}</span>
                          </td>
                          <td style={{ padding: '10px 14px' }}>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                              {v.missing_helm  && <span style={{ fontSize: 11, background: 'rgba(239,68,68,0.15)', color: '#F87171', padding: '2px 6px', borderRadius: 4, fontWeight: 600 }}>✗ Helm</span>}
                              {v.missing_vest  && <span style={{ fontSize: 11, background: 'rgba(239,68,68,0.15)', color: '#F87171', padding: '2px 6px', borderRadius: 4, fontWeight: 600 }}>✗ Rompi</span>}
                              {v.missing_shoes && <span style={{ fontSize: 11, background: 'rgba(239,68,68,0.15)', color: '#F87171', padding: '2px 6px', borderRadius: 4, fontWeight: 600 }}>✗ Sepatu</span>}
                            </div>
                          </td>
                          <td style={{ padding: '10px 14px', fontSize: 12, color: '#64748B', fontFamily: 'DM Sans, sans-serif' }}>{v.shift}</td>
                          <td style={{ padding: '10px 14px' }}>
                            <div>
                              <StatusBadge status={v.status} />
                              {v.status === 'rejected' && v.reject_reason && (
                                <p style={{ fontSize: 11, color: '#64748B', marginTop: 2, maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontFamily: 'DM Sans, sans-serif' }}
                                  title={v.reject_reason ?? ''}>
                                  {v.reject_reason}
                                </p>
                              )}
                            </div>
                          </td>
                          <td style={{ padding: '10px 14px', fontSize: 11, color: '#64748B', fontFamily: 'JetBrains Mono, monospace', whiteSpace: 'nowrap' }}>
                            {new Date(v.detected_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                          </td>
                          <td style={{ padding: '10px 14px' }}>
                            {v.frame_key
                              ? <button onClick={() => downloadFrame(v.id)} style={{ background: 'transparent', border: 'none', color: '#3B82F6', cursor: 'pointer', fontSize: 16 }}>📷</button>
                              : <span style={{ color: '#334155', fontSize: 12 }}>-</span>}
                          </td>
                          <td style={{ padding: '10px 14px' }}>
                            {v.links && v.links.length > 0 ? (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                {v.links.map(l => (
                                  <p key={l.personnel_id} style={{ fontSize: 12, color: '#94A3B8', fontFamily: 'DM Sans, sans-serif', maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', margin: 0 }}>
                                    {l.personnel?.full_name ?? l.personnel_id}
                                  </p>
                                ))}
                              </div>
                            ) : (
                              <span style={{ fontSize: 12, color: '#334155' }}>-</span>
                            )}
                          </td>
                          {canEdit && (
                            <td style={{ padding: '10px 14px', textAlign: 'right' }}>
                              {v.status !== 'rejected' ? (
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 6 }}>
                                  {/* Link button */}
                                  <button
                                    onClick={() => setLinkingViol(v)}
                                    style={{ padding: '4px 10px', fontSize: 11, color: '#F97316', border: '1px solid rgba(249,115,22,0.3)', borderRadius: 6, background: 'rgba(249,115,22,0.08)', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}
                                  >🔗 Link</button>

                                  {/* Confirm button */}
                                  {v.status === 'pending' && (
                                    <button
                                      onClick={() => handleConfirm(v)}
                                      style={{ padding: '4px 10px', fontSize: 11, color: '#22C55E', border: '1px solid rgba(34,197,94,0.3)', borderRadius: 6, background: 'rgba(34,197,94,0.08)', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}
                                    >✓</button>
                                  )}

                                  {/* Reject button */}
                                  <button
                                    onClick={() => setRejectingViol(v)}
                                    style={{ padding: '4px 10px', fontSize: 11, color: '#EF4444', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 6, background: 'rgba(239,68,68,0.08)', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}
                                  >✗</button>
                                </div>
                              ) : (
                                <span style={{ fontSize: 11, color: '#64748B', fontFamily: 'DM Sans, sans-serif' }}>
                                  oleh {v.rejected_by}
                                </span>
                              )}
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* ── Pagination ──────────────────────────────────────────────────────── */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 8 }}>
          <p style={{ fontSize: 13, color: '#64748B', fontFamily: 'DM Sans, sans-serif', margin: 0 }}>
            {total} pelanggaran · Hal {page} dari {totalPages}
          </p>
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  className={cn(page <= 1 && 'pointer-events-none opacity-40')}
                />
              </PaginationItem>

              {pageNumbers.map((n, idx) =>
                n === '...'
                  ? <PaginationItem key={`ellipsis-${idx}`}><PaginationEllipsis /></PaginationItem>
                  : <PaginationItem key={n}>
                      <PaginationLink
                        isActive={n === page}
                        onClick={() => setPage(n as number)}
                        style={{ cursor: 'pointer' }}
                      >
                        {n}
                      </PaginationLink>
                    </PaginationItem>
              )}

              <PaginationItem>
                <PaginationNext
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  className={cn(page >= totalPages && 'pointer-events-none opacity-40')}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      )}

      {/* ── Modals ─────────────────────────────────────────────────────────── */}
      {rejectingViol && (
        <RejectModal
          violation={rejectingViol}
          onConfirm={reason => handleReject(rejectingViol, reason)}
          onCancel={() => setRejectingViol(null)}
        />
      )}

      {linkingViol && (
        <LinkViolationModal
          violation={linkingViol}
          onClose={() => setLinkingViol(null)}
          onLinked={() => {
            fetchViolations(true)
            setLinkingViol(null)
          }}
        />
      )}
    </div>
  )
}
