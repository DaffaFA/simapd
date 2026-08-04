'use client'

import { useState, useEffect } from 'react'
import { apiFetch } from '@/src/lib/api'
import { Loader2 } from 'lucide-react'

interface Camera {
  id:        string
  camera_id: string
  name:      string
  zone:      string
  rtsp_url:  string
  is_active: boolean
}

type CameraForm = Omit<Camera, 'id'>

const EMPTY_FORM: CameraForm = {
  camera_id: '', name: '', zone: '', rtsp_url: '', is_active: true,
}

export default function CamerasPage() {
  const [cameras, setCameras] = useState<Camera[]>([])
  const [loading, setLoading] = useState(true)
  const [form,    setForm]    = useState<CameraForm>(EMPTY_FORM)
  const [editing, setEditing] = useState<string | null>(null)
  const [saving,  setSaving]  = useState(false)
  const [error,   setError]   = useState<string | null>(null)

  const load = () => {
    setLoading(true)
    apiFetch<Camera[]>('/stream/cameras')
      .then(setCameras).catch(() => setCameras([]))
      .finally(() => setLoading(false))
  }
  useEffect(load, [])

  const handleSubmit = async () => {
    if (!form.camera_id.trim() || !form.name.trim()) {
      setError('ID Kamera dan Nama wajib diisi')
      return
    }
    setSaving(true); setError(null)
    try {
      if (editing) {
        await apiFetch(`/stream/cameras/${editing}`, { method: 'PATCH', body: JSON.stringify(form) })
      } else {
        await apiFetch('/stream/cameras', { method: 'POST', body: JSON.stringify(form) })
      }
      setForm(EMPTY_FORM); setEditing(null); load()
    } catch (e: any) {
      setError(e.message ?? 'Gagal menyimpan')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Hapus kamera ini?')) return
    await apiFetch(`/stream/cameras/${id}`, { method: 'DELETE' }).catch(console.error)
    load()
  }

  const startEdit = (cam: Camera) => {
    setEditing(cam.id)
    setForm({
      camera_id: cam.camera_id, name: cam.name, zone: cam.zone,
      rtsp_url: cam.rtsp_url, is_active: cam.is_active,
    })
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '8px 12px',
    fontSize: 13, fontFamily: 'DM Sans, sans-serif',
    background: '#0D1117', border: '1px solid #1E2D3D',
    borderRadius: 6, color: '#E2E8F0', outline: 'none',
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* Camera list */}
      <div style={{ background: '#111827', border: '1px solid #1E2D3D', borderRadius: 12, overflow: 'hidden' }}>
        <div style={{ padding: '14px 20px', borderBottom: '1px solid #1E2D3D', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h2 style={{ fontSize: 15, fontFamily: 'DM Sans, sans-serif', fontWeight: 700, color: '#E2E8F0', margin: 0 }}>
            Daftar Kamera
          </h2>
          <span style={{ fontSize: 12, fontFamily: 'DM Sans, sans-serif', color: '#64748B' }}>
            {cameras.length} kamera
          </span>
        </div>

        {loading ? (
          <div style={{ padding: '32px 20px', textAlign: 'center', fontSize: 13, fontFamily: 'DM Sans, sans-serif', color: '#64748B', display: 'flex', justifyContent: 'center', gap: 8 }}>
            <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />
            Memuat...
          </div>
        ) : cameras.length === 0 ? (
          <div style={{ padding: '32px 20px', textAlign: 'center', fontSize: 13, fontFamily: 'DM Sans, sans-serif', color: '#64748B' }}>
            Belum ada kamera. Tambahkan di bawah.
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #1E2D3D' }}>
                {['ID Kamera', 'Nama', 'Zona', 'Status', 'Aksi'].map(col => (
                  <th key={col} style={{
                    padding: '10px 20px', textAlign: 'left', fontSize: 10,
                    fontFamily: 'DM Sans, sans-serif', fontWeight: 600, color: '#64748B',
                    textTransform: 'uppercase', letterSpacing: '0.08em',
                  }}>{col}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {cameras.map(cam => (
                <tr key={cam.id} style={{ borderBottom: '1px solid #1E2D3D' }}>
                  <td style={{ padding: '10px 20px', fontFamily: 'JetBrains Mono, monospace', fontSize: 12, color: '#94A3B8' }}>
                    {cam.camera_id}
                  </td>
                  <td style={{ padding: '10px 20px', fontSize: 13, fontFamily: 'DM Sans, sans-serif', fontWeight: 500, color: '#E2E8F0' }}>
                    {cam.name}
                  </td>
                  <td style={{ padding: '10px 20px', fontSize: 12, fontFamily: 'DM Sans, sans-serif', color: '#64748B' }}>
                    {cam.zone}
                  </td>
                  <td style={{ padding: '10px 20px' }}>
                    <span style={{
                      display: 'inline-flex', alignItems: 'center', gap: 5,
                      fontSize: 11, fontFamily: 'DM Sans, sans-serif', fontWeight: 500,
                      padding: '3px 10px', borderRadius: 12,
                      background: cam.is_active ? 'rgba(34,197,94,0.1)' : 'rgba(100,116,139,0.1)',
                      color: cam.is_active ? '#22C55E' : '#64748B',
                    }}>
                      <span style={{
                        width: 5, height: 5, borderRadius: '50%',
                        background: cam.is_active ? '#22C55E' : '#64748B',
                      }} />
                      {cam.is_active ? 'Aktif' : 'Nonaktif'}
                    </span>
                  </td>
                  <td style={{ padding: '10px 20px' }}>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button onClick={() => startEdit(cam)}
                        style={{ fontSize: 11, fontFamily: 'DM Sans, sans-serif', color: '#3B82F6', background: 'transparent', border: 'none', cursor: 'pointer', padding: '2px 6px' }}>
                        Edit
                      </button>
                      <button onClick={() => handleDelete(cam.id)}
                        style={{ fontSize: 11, fontFamily: 'DM Sans, sans-serif', color: '#EF4444', background: 'transparent', border: 'none', cursor: 'pointer', padding: '2px 6px' }}>
                        Hapus
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Add / Edit form */}
      <div style={{
        background: '#111827', border: '1px solid #1E2D3D', borderRadius: 12,
        padding: 20, display: 'flex', flexDirection: 'column', gap: 14,
      }}>
        <h3 style={{ fontSize: 14, fontFamily: 'DM Sans, sans-serif', fontWeight: 600, color: '#E2E8F0', margin: 0 }}>
          {editing ? 'Edit Kamera' : 'Tambah Kamera Baru'}
        </h3>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          {[
            { key: 'camera_id' as const, label: 'ID Kamera', placeholder: 'CAM-01' },
            { key: 'name' as const,      label: 'Nama',      placeholder: 'Kamera Pintu Masuk' },
            { key: 'zone' as const,      label: 'Zona',      placeholder: 'Area Loading Dock' },
          ].map(({ key, label, placeholder }) => (
            <div key={key} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <span style={{ fontSize: 10, fontFamily: 'DM Sans, sans-serif', fontWeight: 600, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                {label}
              </span>
              <input type="text" placeholder={placeholder}
                value={form[key]}
                onChange={e => setForm(p => ({ ...p, [key]: e.target.value }))}
                style={inputStyle}
              />
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <span style={{ fontSize: 10, fontFamily: 'DM Sans, sans-serif', fontWeight: 600, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            RTSP URL
          </span>
          <input type="text" placeholder="rtsp://user:pass@192.168.1.100:554/stream"
            value={form.rtsp_url}
            onChange={e => setForm(p => ({ ...p, rtsp_url: e.target.value }))}
            style={{ ...inputStyle, fontFamily: 'JetBrains Mono, monospace' }}
          />
        </div>

        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontFamily: 'DM Sans, sans-serif', color: '#E2E8F0', cursor: 'pointer' }}>
          <input type="checkbox" checked={form.is_active}
            onChange={e => setForm(p => ({ ...p, is_active: e.target.checked }))}
            style={{ width: 16, height: 16, accentColor: '#F97316' }}
          />
          Kamera aktif
        </label>

        {error && <p style={{ fontSize: 12, fontFamily: 'DM Sans, sans-serif', color: '#EF4444', margin: 0 }}>{error}</p>}

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingTop: 4 }}>
          {editing && (
            <button onClick={() => { setEditing(null); setForm(EMPTY_FORM) }}
              style={{
                padding: '8px 14px', fontSize: 12, fontFamily: 'DM Sans, sans-serif',
                borderRadius: 6, border: '1px solid #1E2D3D', background: 'transparent',
                color: '#94A3B8', cursor: 'pointer',
              }}>
              Batal
            </button>
          )}
          <button onClick={handleSubmit} disabled={saving}
            style={{
              padding: '8px 18px', fontSize: 12, fontFamily: 'DM Sans, sans-serif', fontWeight: 600,
              borderRadius: 6, border: 'none',
              background: saving ? 'rgba(249,115,22,0.4)' : '#F97316',
              color: '#fff', cursor: saving ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', gap: 6,
              transition: 'background 0.15s',
            }}>
            {saving && <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} />}
            {saving ? 'Menyimpan...' : editing ? 'Simpan Perubahan' : 'Tambah Kamera'}
          </button>
        </div>
      </div>
    </div>
  )
}
