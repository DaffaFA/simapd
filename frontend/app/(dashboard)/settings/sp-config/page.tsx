'use client'

import { useState, useEffect } from 'react'
import { apiFetch } from '@/src/lib/api'

interface SpConfig {
  sp1_threshold:     number
  sp2_threshold:     number
  sp3_threshold:     number
  sp1_duration_days: number
  sp2_duration_days: number
  sp3_duration_days: number
}

const SP_LEVELS = [
  { level: 'SP1', threshKey: 'sp1_threshold', durKey: 'sp1_duration_days', color: '#EAB308', bgColor: 'rgba(234,179,8,0.1)' },
  { level: 'SP2', threshKey: 'sp2_threshold', durKey: 'sp2_duration_days', color: '#F97316', bgColor: 'rgba(249,115,22,0.1)' },
  { level: 'SP3', threshKey: 'sp3_threshold', durKey: 'sp3_duration_days', color: '#EF4444', bgColor: 'rgba(239,68,68,0.1)' },
] as const

export default function SpConfigPage() {
  const [config,  setConfig]  = useState<SpConfig | null>(null)
  const [draft,   setDraft]   = useState<SpConfig | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving,  setSaving]  = useState(false)
  const [saved,   setSaved]   = useState(false)
  const [error,   setError]   = useState<string | null>(null)

  useEffect(() => {
    apiFetch<SpConfig>('/sp/config')
      .then(c => { setConfig(c); setDraft(c) })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  const handleSave = async () => {
    if (!draft) return
    setSaving(true); setError(null); setSaved(false)
    try {
      const updated = await apiFetch<SpConfig>('/sp/config', {
        method: 'PUT',
        body: JSON.stringify(draft),
      })
      setConfig(updated); setDraft(updated)
      setSaved(true); setTimeout(() => setSaved(false), 3000)
    } catch (e: any) {
      setError(e.message ?? 'Gagal menyimpan konfigurasi')
    } finally {
      setSaving(false)
    }
  }

  const setField = (key: keyof SpConfig, value: number) =>
    setDraft(prev => prev ? { ...prev, [key]: value } : null)

  const isDirty = JSON.stringify(config) !== JSON.stringify(draft)

  if (loading) {
    return (
      <div style={{ padding: 32, textAlign: 'center', fontSize: 13, fontFamily: 'DM Sans, sans-serif', color: '#64748B' }}>
        Memuat konfigurasi...
      </div>
    )
  }

  const inputStyle: React.CSSProperties = {
    width: 72, padding: '6px 10px',
    fontSize: 13, fontFamily: 'JetBrains Mono, monospace',
    background: '#0D1117', border: '1px solid #1E2D3D',
    borderRadius: 6, color: '#E2E8F0', outline: 'none',
    textAlign: 'center',
  }

  return (
    <div style={{
      background: '#111827', border: '1px solid #1E2D3D', borderRadius: 12,
      padding: 24, display: 'flex', flexDirection: 'column', gap: 20,
    }}>
      {/* Header */}
      <div>
        <h2 style={{ fontSize: 16, fontFamily: 'DM Sans, sans-serif', fontWeight: 700, color: '#E2E8F0', margin: 0 }}>
          Konfigurasi Surat Peringatan (SP)
        </h2>
        <p style={{ fontSize: 12, fontFamily: 'DM Sans, sans-serif', color: '#64748B', margin: '6px 0 0' }}>
          Atur jumlah pelanggaran yang memicu penerbitan SP otomatis dan masa berlakunya.
        </p>
      </div>

      {/* SP rows */}
      {draft && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {SP_LEVELS.map(({ level, threshKey, durKey, color, bgColor }) => (
            <div key={level} style={{
              display: 'grid', gridTemplateColumns: '80px 1fr 1fr', gap: 16, alignItems: 'center',
              padding: '14px 16px', background: '#0D1117', borderRadius: 8, border: '1px solid #1E2D3D',
            }}>
              <span style={{
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                padding: '4px 12px', borderRadius: 16, fontSize: 12, fontWeight: 700,
                fontFamily: 'DM Sans, sans-serif', background: bgColor, color: color,
              }}>
                {level}
              </span>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <span style={{ fontSize: 10, fontFamily: 'DM Sans, sans-serif', fontWeight: 600, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                  Jumlah Pelanggaran
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <input type="number" min={1} max={100}
                    value={draft[threshKey]} onChange={e => setField(threshKey, +e.target.value)}
                    style={inputStyle}
                  />
                  <span style={{ fontSize: 11, color: '#64748B', fontFamily: 'DM Sans, sans-serif' }}>pelanggaran</span>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <span style={{ fontSize: 10, fontFamily: 'DM Sans, sans-serif', fontWeight: 600, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                  Masa Berlaku
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <input type="number" min={1} max={365}
                    value={draft[durKey]} onChange={e => setField(durKey, +e.target.value)}
                    style={inputStyle}
                  />
                  <span style={{ fontSize: 11, color: '#64748B', fontFamily: 'DM Sans, sans-serif' }}>hari</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Info box */}
      <div style={{
        fontSize: 11, fontFamily: 'DM Sans, sans-serif', color: '#64748B',
        background: 'rgba(59,130,246,0.06)', border: '1px solid rgba(59,130,246,0.15)',
        borderRadius: 8, padding: '10px 14px', lineHeight: 1.6,
      }}>
        <strong style={{ color: '#3B82F6' }}>Cara kerja:</strong> Jika seorang karyawan mencapai jumlah pelanggaran
        yang ditentukan, sistem otomatis menerbitkan SP. SP2 hanya diterbitkan setelah SP1
        aktif, dan seterusnya.
      </div>

      {/* Feedback */}
      {error && <p style={{ fontSize: 12, fontFamily: 'DM Sans, sans-serif', color: '#EF4444', margin: 0 }}>{error}</p>}
      {saved && <p style={{ fontSize: 12, fontFamily: 'DM Sans, sans-serif', color: '#22C55E', fontWeight: 500, margin: 0 }}>✓ Konfigurasi berhasil disimpan</p>}

      {/* Actions */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 10, paddingTop: 8, borderTop: '1px solid #1E2D3D' }}>
        <button onClick={() => setDraft(config)} disabled={!isDirty || saving}
          style={{
            padding: '8px 16px', fontSize: 12, fontFamily: 'DM Sans, sans-serif',
            borderRadius: 6, border: '1px solid #1E2D3D', background: 'transparent',
            color: '#94A3B8', cursor: (!isDirty || saving) ? 'not-allowed' : 'pointer',
            opacity: (!isDirty || saving) ? 0.4 : 1, transition: 'opacity 0.15s',
          }}>
          Reset
        </button>
        <button onClick={handleSave} disabled={!isDirty || saving}
          style={{
            padding: '8px 18px', fontSize: 12, fontFamily: 'DM Sans, sans-serif', fontWeight: 600,
            borderRadius: 6, border: 'none',
            background: (!isDirty || saving) ? 'rgba(249,115,22,0.4)' : '#F97316',
            color: '#fff', cursor: (!isDirty || saving) ? 'not-allowed' : 'pointer',
            transition: 'background 0.15s',
          }}>
          {saving ? 'Menyimpan...' : 'Simpan Konfigurasi'}
        </button>
      </div>
    </div>
  )
}
