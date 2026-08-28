'use client'

import { useState, useEffect } from 'react'
import { apiFetch } from '@/src/lib/api'
import { useAuth } from '@/src/lib/AuthContext'
import { hasRole } from '@/src/lib/roles'
import { ROLE_LABELS } from '@/src/lib/roles'
import type { Role } from '@/src/types/simapd'
import { Loader2 } from 'lucide-react'

interface Account {
  id:         string
  username:   string
  email:      string
  full_name:  string | null
  role:       Role
  is_active:  boolean
  last_login: string | null
  signature:  string | null
}

interface AccountForm {
  username:  string
  email:     string
  password:  string
  full_name: string
  role:      Role
  signature: string | null
}

const EMPTY_FORM: AccountForm = {
  username: '', email: '', password: '', full_name: '', role: 'safety_officer', signature: null,
}

const MAX_SIGNATURE_BYTES = 1_500_000

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })
}

const ROLE_OPTIONS: Role[] = ['admin', 'supervisor', 'safety_officer']

export default function AkunPage() {
  const { user: currentUser } = useAuth()
  const isAdmin = hasRole(currentUser?.role, ['admin'])

  const [accounts, setAccounts] = useState<Account[]>([])
  const [loading,  setLoading]  = useState(true)
  const [form,     setForm]     = useState<AccountForm>(EMPTY_FORM)
  const [editing,  setEditing]  = useState<string | null>(null)
  const [saving,   setSaving]   = useState(false)
  const [error,    setError]    = useState<string | null>(null)

  const load = () => {
    setLoading(true)
    apiFetch<Account[]>('/users')
      .then(setAccounts).catch(() => setAccounts([]))
      .finally(() => setLoading(false))
  }
  useEffect(() => { if (isAdmin) load() }, [isAdmin])

  const handleSubmit = async () => {
    if (!form.username.trim() || !form.email.trim()) {
      setError('Username dan email wajib diisi')
      return
    }
    if (!editing && form.password.length < 6) {
      setError('Password minimal 6 karakter')
      return
    }
    setSaving(true); setError(null)
    try {
      const body: Partial<AccountForm> = { ...form }
      if (editing && !form.password) delete body.password
      if (editing) {
        await apiFetch(`/users/${editing}`, { method: 'PUT', body: JSON.stringify(body) })
      } else {
        await apiFetch('/users', { method: 'POST', body: JSON.stringify(body) })
      }
      setForm(EMPTY_FORM); setEditing(null); load()
    } catch (e: any) {
      setError(e.message ?? 'Gagal menyimpan')
    } finally {
      setSaving(false)
    }
  }

  const handleDeactivate = async (acc: Account) => {
    if (!confirm(`Nonaktifkan akun "${acc.username}"?`)) return
    try {
      await apiFetch(`/users/${acc.id}`, { method: 'DELETE' })
      load()
    } catch (e: any) {
      alert(e.message ?? 'Gagal menonaktifkan akun')
    }
  }

  const startEdit = (acc: Account) => {
    setEditing(acc.id)
    setError(null)
    setForm({
      username: acc.username, email: acc.email, password: '',
      full_name: acc.full_name ?? '', role: acc.role, signature: acc.signature ?? null,
    })
  }

  const handleSignatureFile = async (file: File | undefined) => {
    if (!file) return
    if (file.size > MAX_SIGNATURE_BYTES) {
      setError('Ukuran gambar tanda tangan maksimal 1.5MB')
      return
    }
    try {
      const dataUrl = await fileToDataUrl(file)
      setForm(p => ({ ...p, signature: dataUrl }))
      setError(null)
    } catch {
      setError('Gagal membaca file tanda tangan')
    }
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '8px 12px',
    fontSize: 13, fontFamily: 'DM Sans, sans-serif',
    background: '#0D1117', border: '1px solid #1E2D3D',
    borderRadius: 6, color: '#E2E8F0', outline: 'none',
  }

  if (!isAdmin) {
    return (
      <div style={{ padding: '32px 20px', textAlign: 'center', fontSize: 13, fontFamily: 'DM Sans, sans-serif', color: '#64748B' }}>
        Hanya admin yang dapat mengakses manajemen akun.
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* Account list */}
      <div style={{ background: '#111827', border: '1px solid #1E2D3D', borderRadius: 12, overflow: 'hidden' }}>
        <div style={{ padding: '14px 20px', borderBottom: '1px solid #1E2D3D', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h2 style={{ fontSize: 15, fontFamily: 'DM Sans, sans-serif', fontWeight: 700, color: '#E2E8F0', margin: 0 }}>
            Daftar Akun
          </h2>
          <span style={{ fontSize: 12, fontFamily: 'DM Sans, sans-serif', color: '#64748B' }}>
            {accounts.length} akun
          </span>
        </div>

        {loading ? (
          <div style={{ padding: '32px 20px', textAlign: 'center', fontSize: 13, fontFamily: 'DM Sans, sans-serif', color: '#64748B', display: 'flex', justifyContent: 'center', gap: 8 }}>
            <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />
            Memuat...
          </div>
        ) : accounts.length === 0 ? (
          <div style={{ padding: '32px 20px', textAlign: 'center', fontSize: 13, fontFamily: 'DM Sans, sans-serif', color: '#64748B' }}>
            Belum ada akun. Tambahkan di bawah.
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #1E2D3D' }}>
                {['Username', 'Nama', 'Email', 'Role', 'Status', 'Aksi'].map(col => (
                  <th key={col} style={{
                    padding: '10px 20px', textAlign: 'left', fontSize: 10,
                    fontFamily: 'DM Sans, sans-serif', fontWeight: 600, color: '#64748B',
                    textTransform: 'uppercase', letterSpacing: '0.08em',
                  }}>{col}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {accounts.map(acc => (
                <tr key={acc.id} style={{ borderBottom: '1px solid #1E2D3D' }}>
                  <td style={{ padding: '10px 20px', fontFamily: 'JetBrains Mono, monospace', fontSize: 12, color: '#94A3B8' }}>
                    {acc.username}
                  </td>
                  <td style={{ padding: '10px 20px', fontSize: 13, fontFamily: 'DM Sans, sans-serif', fontWeight: 500, color: '#E2E8F0' }}>
                    {acc.full_name || '-'}
                  </td>
                  <td style={{ padding: '10px 20px', fontSize: 12, fontFamily: 'DM Sans, sans-serif', color: '#64748B' }}>
                    {acc.email}
                  </td>
                  <td style={{ padding: '10px 20px', fontSize: 12, fontFamily: 'DM Sans, sans-serif', color: '#94A3B8' }}>
                    {ROLE_LABELS[acc.role]}
                  </td>
                  <td style={{ padding: '10px 20px' }}>
                    <span style={{
                      display: 'inline-flex', alignItems: 'center', gap: 5,
                      fontSize: 11, fontFamily: 'DM Sans, sans-serif', fontWeight: 500,
                      padding: '3px 10px', borderRadius: 12,
                      background: acc.is_active ? 'rgba(34,197,94,0.1)' : 'rgba(100,116,139,0.1)',
                      color: acc.is_active ? '#22C55E' : '#64748B',
                    }}>
                      <span style={{
                        width: 5, height: 5, borderRadius: '50%',
                        background: acc.is_active ? '#22C55E' : '#64748B',
                      }} />
                      {acc.is_active ? 'Aktif' : 'Nonaktif'}
                    </span>
                  </td>
                  <td style={{ padding: '10px 20px' }}>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button onClick={() => startEdit(acc)}
                        style={{ fontSize: 11, fontFamily: 'DM Sans, sans-serif', color: '#3B82F6', background: 'transparent', border: 'none', cursor: 'pointer', padding: '2px 6px' }}>
                        Edit
                      </button>
                      {acc.is_active && acc.id !== currentUser?.id && (
                        <button onClick={() => handleDeactivate(acc)}
                          style={{ fontSize: 11, fontFamily: 'DM Sans, sans-serif', color: '#EF4444', background: 'transparent', border: 'none', cursor: 'pointer', padding: '2px 6px' }}>
                          Nonaktifkan
                        </button>
                      )}
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
          {editing ? 'Edit Akun' : 'Tambah Akun Baru'}
        </h3>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span style={{ fontSize: 10, fontFamily: 'DM Sans, sans-serif', fontWeight: 600, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Username
            </span>
            <input type="text" placeholder="jdoe"
              value={form.username}
              onChange={e => setForm(p => ({ ...p, username: e.target.value }))}
              style={inputStyle}
            />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span style={{ fontSize: 10, fontFamily: 'DM Sans, sans-serif', fontWeight: 600, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Nama Lengkap
            </span>
            <input type="text" placeholder="John Doe"
              value={form.full_name}
              onChange={e => setForm(p => ({ ...p, full_name: e.target.value }))}
              style={inputStyle}
            />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span style={{ fontSize: 10, fontFamily: 'DM Sans, sans-serif', fontWeight: 600, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Email
            </span>
            <input type="email" placeholder="jdoe@perusahaan.com"
              value={form.email}
              onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
              style={inputStyle}
            />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span style={{ fontSize: 10, fontFamily: 'DM Sans, sans-serif', fontWeight: 600, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Password {editing && '(kosongkan jika tidak diubah)'}
            </span>
            <input type="password" placeholder="••••••••"
              value={form.password}
              onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
              style={inputStyle}
            />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span style={{ fontSize: 10, fontFamily: 'DM Sans, sans-serif', fontWeight: 600, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Role
            </span>
            <select
              value={form.role}
              onChange={e => setForm(p => ({ ...p, role: e.target.value as Role }))}
              style={{ ...inputStyle, cursor: 'pointer' }}
            >
              {ROLE_OPTIONS.map(r => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
            </select>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span style={{ fontSize: 10, fontFamily: 'DM Sans, sans-serif', fontWeight: 600, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Tanda Tangan (untuk Surat Peringatan)
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              {form.signature && (
                <img src={form.signature} alt="Tanda tangan"
                  style={{ height: 36, maxWidth: 100, objectFit: 'contain', background: '#fff', borderRadius: 4, padding: '2px 6px' }}
                />
              )}
              <input type="file" accept="image/png,image/jpeg,image/webp"
                onChange={e => handleSignatureFile(e.target.files?.[0])}
                style={{ fontSize: 11, fontFamily: 'DM Sans, sans-serif', color: '#94A3B8', flex: 1 }}
              />
              {form.signature && (
                <button type="button" onClick={() => setForm(p => ({ ...p, signature: null }))}
                  style={{ fontSize: 11, fontFamily: 'DM Sans, sans-serif', color: '#EF4444', background: 'transparent', border: 'none', cursor: 'pointer', padding: '2px 6px', whiteSpace: 'nowrap' }}>
                  Hapus
                </button>
              )}
            </div>
          </div>
        </div>

        {error && <p style={{ fontSize: 12, fontFamily: 'DM Sans, sans-serif', color: '#EF4444', margin: 0 }}>{error}</p>}

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingTop: 4 }}>
          {editing && (
            <button onClick={() => { setEditing(null); setForm(EMPTY_FORM); setError(null) }}
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
            {saving ? 'Menyimpan...' : editing ? 'Simpan Perubahan' : 'Tambah Akun'}
          </button>
        </div>
      </div>
    </div>
  )
}
