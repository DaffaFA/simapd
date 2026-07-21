'use client'
import { useState, useEffect, useRef } from 'react'
import {
  getViolationLinks, linkViolationToPersonnel,
  unlinkViolationPersonnel, searchPersonnel,
} from '@/src/lib/api'
import type { ViolationLink } from '@/src/lib/api'
import type { Personnel } from '@/components/shared/types'
import Link from 'next/link'

interface Props {
  violationId: string
  readOnly?: boolean
}

export function LinkPersonnelPanel({ violationId, readOnly = false }: Props) {
  const [links, setLinks] = useState<ViolationLink[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQ, setSearchQ] = useState('')
  const [results, setResults] = useState<Personnel[]>([])
  const [selected, setSelected] = useState<Personnel[]>([])
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showDrop, setShowDrop] = useState(false)
  const searchRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    getViolationLinks(violationId)
      .then(setLinks)
      .catch(() => setLinks([]))
      .finally(() => setLoading(false))
  }, [violationId])

  useEffect(() => {
    if (searchQ.length < 2) { setResults([]); return }
    const t = setTimeout(() => {
      searchPersonnel(searchQ).then((res: any[]) => {
        const linkedIds = new Set(links.map(l => l.personnel_id))
        const selectedIds = new Set(selected.map(s => s.id))
        setResults(res.filter((p: any) => !linkedIds.has(p.id) && !selectedIds.has(p.id)))
        setShowDrop(true)
      })
    }, 300)
    return () => clearTimeout(t)
  }, [searchQ, links, selected])

  const addToSelected = (person: Personnel) => {
    setSelected(prev => [...prev, person])
    setSearchQ('')
    setResults([])
    setShowDrop(false)
  }

  const removeFromSelected = (personId: string) => {
    setSelected(prev => prev.filter(p => p.id !== personId))
  }

  const handleLink = async () => {
    if (selected.length === 0) return
    setSaving(true)
    setError(null)
    try {
      await linkViolationToPersonnel(
        violationId,
        selected.map(p => p.id),
        notes || undefined,
      )
      const updated = await getViolationLinks(violationId)
      setLinks(updated)
      setSelected([])
      setNotes('')
    } catch (e: any) {
      setError(e.message ?? 'Gagal menyimpan tautan')
    } finally {
      setSaving(false)
    }
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

  const roleColor: Record<string, { bg: string, color: string }> = {
    'Pekerja': { bg: 'rgba(234,179,8,0.1)', color: '#EAB308' },
    'Supervisor': { bg: 'rgba(59,130,246,0.1)', color: '#3B82F6' },
    'Safety Officer': { bg: 'rgba(34,197,94,0.1)', color: '#22C55E' },
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* Linked users */}
      <div>
        <p style={{ fontSize: 13, fontFamily: 'DM Sans, sans-serif', fontWeight: 600, color: '#E2E8F0', marginBottom: 8 }}>
          Terhubung ke{loading ? '...' : ` ${links.length} orang`}
        </p>
        {links.length === 0 && !loading && (
          <p style={{ fontSize: 12, color: '#64748B', fontStyle: 'italic', margin: 0 }}>Belum ada karyawan yang dihubungkan</p>
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

      {/* Add new link */}
      {!readOnly && (
        <div style={{ borderTop: '1px solid #1E2D3D', paddingTop: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <p style={{ fontSize: 13, fontFamily: 'DM Sans, sans-serif', fontWeight: 600, color: '#E2E8F0', margin: 0 }}>Tambah Tautan Karyawan</p>

          <div style={{ position: 'relative' }}>
            <input
              ref={searchRef}
              type="text"
              placeholder="Cari nama atau ID karyawan..."
              value={searchQ}
              onChange={e => setSearchQ(e.target.value)}
              onFocus={() => results.length > 0 && setShowDrop(true)}
              style={{ width: '100%', background: '#0D1117', border: '1px solid #1E2D3D', borderRadius: 8, padding: '8px 12px', fontSize: 13, fontFamily: 'DM Sans, sans-serif', color: '#E2E8F0', outline: 'none' }}
            />

            {showDrop && results.length > 0 && (
              <div style={{ position: 'absolute', zIndex: 20, width: '100%', marginTop: 4, background: '#111827', border: '1px solid #1E2D3D', borderRadius: 8, boxShadow: '0 4px 6px -1px rgba(0,0,0,0.5)', maxHeight: 192, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
                {results.map(person => {
                  const rColor = roleColor[person.role as string] ?? { bg: 'rgba(255,255,255,0.1)', color: '#94A3B8' }
                  return (
                    <button
                      key={person.id}
                      onClick={() => addToSelected(person)}
                      style={{ width: '100%', textAlign: 'left', padding: '8px 12px', background: 'transparent', border: 'none', borderBottom: '1px solid #1E2D3D', display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', transition: 'background 0.15s' }}
                      onMouseEnter={e => { (e.target as HTMLElement).style.background = 'rgba(59,130,246,0.1)'; }}
                      onMouseLeave={e => { (e.target as HTMLElement).style.background = 'transparent'; }}
                    >
                      <span style={{ fontSize: 10, padding: '2px 6px', borderRadius: 12, fontWeight: 600, background: rColor.bg, color: rColor.color }}>
                        {person.role}
                      </span>
                      <span style={{ fontSize: 13, fontWeight: 500, color: '#E2E8F0' }}>{person.name || (person as any).full_name}</span>
                      <span style={{ fontSize: 11, color: '#64748B' }}>{person.employeeId || (person as any).employee_id}</span>
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          {selected.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <p style={{ fontSize: 11, color: '#64748B', margin: 0 }}>Akan ditambahkan:</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {selected.map(person => (
                  <span key={person.id} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '4px 8px', background: 'rgba(249,115,22,0.1)', border: '1px solid rgba(249,115,22,0.2)', color: '#F97316', borderRadius: 16, fontSize: 12 }}>
                    {person.name || (person as any).full_name}
                    <button onClick={() => removeFromSelected(person.id)} style={{ background: 'transparent', border: 'none', color: '#F97316', fontWeight: 'bold', cursor: 'pointer', padding: '0 2px' }}>×</button>
                  </span>
                ))}
              </div>
            </div>
          )}

          <input
            type="text"
            placeholder="Catatan (opsional)"
            value={notes}
            onChange={e => setNotes(e.target.value)}
            style={{ width: '100%', background: '#0D1117', border: '1px solid #1E2D3D', borderRadius: 8, padding: '8px 12px', fontSize: 13, fontFamily: 'DM Sans, sans-serif', color: '#E2E8F0', outline: 'none' }}
          />

          {error && <p style={{ fontSize: 12, color: '#EF4444', margin: 0 }}>{error}</p>}

          <button
            onClick={handleLink}
            disabled={selected.length === 0 || saving}
            style={{ width: '100%', padding: '10px', background: (selected.length === 0 || saving) ? 'rgba(249,115,22,0.4)' : '#F97316', color: '#fff', borderRadius: 8, border: 'none', fontSize: 13, fontWeight: 600, cursor: (selected.length === 0 || saving) ? 'not-allowed' : 'pointer', transition: 'background 0.2s' }}
          >
            {saving ? 'Menyimpan...' : `Hubungkan ${selected.length > 0 ? `${selected.length} Orang` : 'Karyawan'}`}
          </button>
        </div>
      )}
    </div>
  )
}
