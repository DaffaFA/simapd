'use client'
import { useState, useEffect } from 'react'
import { Loader2 } from 'lucide-react'
import { PersonnelCombobox, type PersonnelOption } from '@/components/ui/PersonnelCombobox'
import {
  getViolationLinks,
  linkViolationToPersonnel,
  unlinkViolationPersonnel,
} from '@/src/lib/api'
import type { ViolationLink } from '@/src/lib/api'
import Link from 'next/link'

interface Props {
  violationId: string
  readOnly?: boolean
  onLinked?: () => void
}

const roleColor: Record<string, { bg: string; color: string }> = {
  'Pekerja':        { bg: 'rgba(234,179,8,0.1)', color: '#EAB308' },
  'Supervisor':     { bg: 'rgba(59,130,246,0.1)', color: '#3B82F6' },
  'Safety Officer': { bg: 'rgba(34,197,94,0.1)', color: '#22C55E' },
}

export function LinkPersonnelPanel({ violationId, readOnly = false, onLinked }: Props) {
  const [links, setLinks]       = useState<ViolationLink[]>([])
  const [loading, setLoading]   = useState(true)
  const [selected, setSelected] = useState<PersonnelOption[]>([])
  const [notes, setNotes]       = useState('')
  const [saving, setSaving]     = useState(false)
  const [error, setError]       = useState<string | null>(null)
  const [success, setSuccess]   = useState(false)

  // IDs yang sudah di-link atau sudah di-select (exclude dari dropdown)
  const excludedIds = [
    ...links.map(l => l.personnel_id),
    ...selected.map(s => s.id),
  ]

  useEffect(() => {
    setLoading(true)
    getViolationLinks(violationId)
      .then(setLinks)
      .catch(() => setLinks([]))
      .finally(() => setLoading(false))
  }, [violationId])

  const handleSelect = (person: PersonnelOption) => {
    setSelected(prev => [...prev, person])
    setError(null)
  }

  const handleRemoveSelected = (id: string) => {
    setSelected(prev => prev.filter(p => p.id !== id))
  }

  const handleUnlink = async (personnelId: string) => {
    if (!confirm('Hapus tautan ini?')) return
    try {
      await unlinkViolationPersonnel(violationId, personnelId)
      setLinks(prev => prev.filter(l => l.personnel_id !== personnelId))
    } catch (e: any) {
      alert(e.message ?? 'Gagal menghapus tautan')
    }
  }

  const handleSubmit = async () => {
    if (!selected.length) return
    setSaving(true)
    setError(null)
    setSuccess(false)
    try {
      await linkViolationToPersonnel(
        violationId,
        selected.map(p => p.id),
        notes.trim() || undefined,
      )
      const updated = await getViolationLinks(violationId)
      setLinks(updated)
      setSelected([])
      setNotes('')
      setSuccess(true)
      onLinked?.()
      setTimeout(() => setSuccess(false), 2000)
    } catch (e: any) {
      setError(e.message ?? 'Gagal menyimpan tautan')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* ── Linked personnel ─────────────────────────────────────── */}
      <div>
        <p style={{ fontSize: 13, fontFamily: 'DM Sans, sans-serif', fontWeight: 600, color: '#E2E8F0', marginBottom: 8 }}>
          Terhubung ke{loading ? '...' : ` ${links.length} orang`}
        </p>

        {links.length === 0 && !loading && (
          <p style={{ fontSize: 12, color: '#64748B', fontStyle: 'italic', margin: 0 }}>
            Belum ada karyawan yang dihubungkan
          </p>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {links.map(link => {
            const rColor = roleColor[link.personnel?.role ?? ''] ?? { bg: 'rgba(255,255,255,0.1)', color: '#94A3B8' }
            return (
              <div key={link.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', border: '1px solid #1E2D3D', borderRadius: 8, background: '#0D1117' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                  <span style={{ flexShrink: 0, fontSize: 10, padding: '2px 6px', borderRadius: 12, fontWeight: 600, background: rColor.bg, color: rColor.color }}>
                    {link.personnel?.role ?? '?'}
                  </span>
                  <Link
                    href={`/personnel/${link.personnel_id}`}
                    style={{ fontSize: 13, fontWeight: 500, color: '#3B82F6', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', textDecoration: 'none' }}
                    onClick={e => e.stopPropagation()}
                    onMouseEnter={e => { (e.target as HTMLElement).style.textDecoration = 'underline'; }}
                    onMouseLeave={e => { (e.target as HTMLElement).style.textDecoration = 'none'; }}
                  >
                    {link.personnel?.full_name ?? link.personnel_id}
                  </Link>
                  <span style={{ fontSize: 11, color: '#64748B', flexShrink: 0 }}>
                    {link.personnel?.employee_id}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0, marginLeft: 8 }}>
                  <span style={{ fontSize: 11, color: '#64748B' }}>
                    oleh {link.linked_by}
                  </span>
                  {!readOnly && (
                    <button
                      onClick={() => handleUnlink(link.personnel_id)}
                      style={{ color: '#EF4444', background: 'transparent', border: 'none', fontSize: 14, cursor: 'pointer', padding: '2px 6px', borderRadius: 4 }}
                      onMouseEnter={e => { (e.target as HTMLElement).style.background = 'rgba(239,68,68,0.1)'; }}
                      onMouseLeave={e => { (e.target as HTMLElement).style.background = 'transparent'; }}
                      title="Hapus tautan"
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* ── Add new links ────────────────────────────────────────────────── */}
      {!readOnly && (
        <div style={{ borderTop: '1px solid #1E2D3D', paddingTop: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <p style={{ fontSize: 13, fontFamily: 'DM Sans, sans-serif', fontWeight: 600, color: '#E2E8F0', margin: 0 }}>Tambah Tautan Karyawan</p>

          {/* Custom combobox - reliable di dalam modal */}
          <PersonnelCombobox
            onSelect={handleSelect}
            excluded={excludedIds}
            placeholder="Cari nama atau ID karyawan..."
          />

          {/* Chips - yang akan di-link */}
          {selected.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <p style={{ fontSize: 11, color: '#64748B', margin: 0 }}>Akan ditambahkan:</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {selected.map(person => (
                  <span key={person.id} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '4px 10px', background: 'rgba(249,115,22,0.1)', border: '1px solid rgba(249,115,22,0.2)', color: '#F97316', borderRadius: 16, fontSize: 12, fontFamily: 'DM Sans, sans-serif' }}>
                    {person.full_name}
                    <button onClick={() => handleRemoveSelected(person.id)} style={{ background: 'transparent', border: 'none', color: '#F97316', fontWeight: 'bold', cursor: 'pointer', padding: '0 2px', lineHeight: 1 }}>×</button>
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Notes */}
          <input
            type="text"
            placeholder="Catatan (opsional)"
            value={notes}
            onChange={e => setNotes(e.target.value)}
            style={{ width: '100%', background: '#0D1117', border: '1px solid #1E2D3D', borderRadius: 8, padding: '8px 12px', fontSize: 13, fontFamily: 'DM Sans, sans-serif', color: '#E2E8F0', outline: 'none' }}
          />

          {/* Feedback */}
          {error && <p style={{ fontSize: 12, color: '#EF4444', margin: 0 }}>{error}</p>}
          {success && (
            <p style={{ fontSize: 12, color: '#22C55E', fontWeight: 500, margin: 0 }}>
              ✓ Tautan berhasil disimpan
            </p>
          )}

          {/* Submit */}
          <button
            onClick={handleSubmit}
            disabled={selected.length === 0 || saving}
            style={{
              width: '100%', padding: '10px',
              background: (selected.length === 0 || saving) ? 'rgba(249,115,22,0.4)' : '#F97316',
              color: '#fff', borderRadius: 8, border: 'none',
              fontSize: 13, fontWeight: 600,
              cursor: (selected.length === 0 || saving) ? 'not-allowed' : 'pointer',
              transition: 'background 0.2s',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            }}
          >
            {saving && <Loader2 style={{ width: 16, height: 16, animation: 'spin 1s linear infinite' }} />}
            {saving ? 'Menyimpan...' : `Hubungkan ${selected.length > 0 ? `${selected.length} Orang` : 'Karyawan'}`}
          </button>
        </div>
      )}
    </div>
  )
}
