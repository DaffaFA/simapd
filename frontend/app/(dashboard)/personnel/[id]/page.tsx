'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
// Mock AuthContext for now, wait, does @/context/AuthContext exist? Let's check imports
import { getPersonnel, updatePersonnel, getViolationsByPersonnel, getSPRecordsByPersonnel, getViolationFrameUrl } from '@/src/lib/api'
import type { Personnel, Violation, SpRecord, UpdatePersonnelDto } from '@/src/types/simapd'

// Let's create a stub useAuth if we don't know where it is, or we'll just check later.
// For now I'll assume we can fake user for edit permissions if useAuth is missing or I'll just check if it exists.
// The user provided `@/context/AuthContext` but the existing codebase might have auth in `lib` or no auth context.
// Let's check where Auth is. I'll import it as requested for now.
import { useAuth } from '@/src/lib/AuthContext'
import { ViolationFrame } from '@/components/violations/ViolationFrame'

// ─── Komponen utama ─────────────────────────────────────────────────────────
export default function PersonnelDetailPage() {
  const { id }    = useParams<{ id: string }>()
  const { user }  = useAuth()
  const router    = useRouter()

  const [personnel,   setPersonnel]   = useState<Personnel | null>(null)
  const [violations,  setViolations]  = useState<Violation[]>([])
  const [spRecords,   setSpRecords]   = useState<SpRecord[]>([])
  const [loading,     setLoading]     = useState(true)
  const [editMode,    setEditMode]    = useState(false)
  const [editData,    setEditData]    = useState<UpdatePersonnelDto>({})
  const [saving,      setSaving]      = useState(false)
  const [saveError,   setSaveError]   = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalViol,   setTotalViol]   = useState(0)

  const canEdit = user?.role === 'Safety Officer' || user?.role === 'admin'

  useEffect(() => {
    if (!id) return
    Promise.all([
      getPersonnel(id),
      getViolationsByPersonnel(id, currentPage),
      getSPRecordsByPersonnel(id),
    ]).then(([p, v, sp]) => {
      setPersonnel(p)
      setEditData({ full_name: p.full_name, role: p.role, helm_color: p.helm_color,
                    department: p.department, is_active: p.is_active })
      // v.items is the array based on PaginatedResponse interface
      setViolations(v.items)
      setTotalViol(v.total)
      setSpRecords(sp)
    }).catch(console.error)
      .finally(() => setLoading(false))
  }, [id, currentPage])

  const handleSave = async () => {
    if (!personnel) return
    setSaving(true)
    setSaveError(null)
    try {
      const updated = await updatePersonnel(personnel.id, editData)
      setPersonnel(updated)
      setEditMode(false)
    } catch (e: any) {
      setSaveError(e.message ?? 'Gagal menyimpan')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="p-8 text-center">Memuat data karyawan...</div>
  if (!personnel) return <div className="p-8 text-center text-red-500">Karyawan tidak ditemukan</div>

  // ── SP Status Badge ────────────────────────────────────────────────────────
  const activeSP = spRecords.find(sp => sp.is_active)
  const spColor: any  = { SP1: 'bg-yellow-100 text-yellow-800', SP2: 'bg-orange-100 text-orange-800',
                     SP3: 'bg-red-100 text-red-800' }

  // ── Helm color indicator ───────────────────────────────────────────────────
  const helmColors: any = { Kuning: '#FFD700', Putih: '#F5F5F5', Hijau: '#4CAF50' }

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <button onClick={() => router.back()} className="text-gray-500 hover:text-gray-700">
            ← Kembali
          </button>
          <div
            className="w-12 h-12 rounded-full border-4 flex items-center justify-center text-lg font-bold"
            style={{ backgroundColor: helmColors[personnel.helm_color] ?? '#ccc',
                     borderColor: helmColors[personnel.helm_color] ?? '#ccc',
                     color: '#000' }}
          >
            {personnel.full_name.charAt(0).toUpperCase()}
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-white">{personnel.full_name}</h1>
            <p className="text-gray-400">{personnel.employee_id} · {personnel.department}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {activeSP && (
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${spColor[activeSP.level]}`}>
              {activeSP.level} Aktif
            </span>
          )}
          <span className={`px-2 py-1 rounded text-xs ${personnel.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
            {personnel.is_active ? 'Aktif' : 'Non-aktif'}
          </span>
          {canEdit && !editMode && (
            <button onClick={() => setEditMode(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">
              Edit
            </button>
          )}
        </div>
      </div>

      {/* ── Info Card ──────────────────────────────────────────────────────── */}
      <div className="bg-[#111827] border border-[#1E2D3D] rounded-xl p-6">
        <h2 className="font-medium text-lg mb-4 text-white">Informasi Karyawan</h2>
        <div className="grid grid-cols-2 gap-4">
          {[
            { label: 'Nama Lengkap', field: 'full_name', type: 'text' },
            { label: 'Jabatan / Role', field: 'role', type: 'select',
              options: ['Pekerja', 'Supervisor', 'Safety Officer'] },
            { label: 'Warna Helm', field: 'helm_color', type: 'select',
              options: ['Kuning', 'Putih', 'Hijau'] },
            { label: 'Departemen', field: 'department', type: 'text' },
          ].map(({ label, field, type, options }) => (
            <div key={field}>
              <label className="text-sm text-gray-400">{label}</label>
              {editMode ? (
                type === 'select' ? (
                  <select
                    className="w-full mt-1 border border-[#1E2D3D] bg-[#0D1117] text-white rounded-lg px-3 py-2 text-sm"
                    value={(editData as any)[field] ?? ''}
                    onChange={e => setEditData(prev => ({ ...prev, [field]: e.target.value }))}
                  >
                    {options!.map(o => <option key={o}>{o}</option>)}
                  </select>
                ) : (
                  <input
                    type="text"
                    className="w-full mt-1 border border-[#1E2D3D] bg-[#0D1117] text-white rounded-lg px-3 py-2 text-sm"
                    value={(editData as any)[field] ?? ''}
                    onChange={e => setEditData(prev => ({ ...prev, [field]: e.target.value }))}
                  />
                )
              ) : (
                <p className="mt-1 font-medium text-white">{(personnel as any)[field] ?? '—'}</p>
              )}
            </div>
          ))}

          {/* Status Aktif toggle hanya saat edit */}
          {editMode && (
            <div className="col-span-2 mt-2">
              <label className="flex items-center gap-2 cursor-pointer text-white">
                <input type="checkbox" checked={editData.is_active ?? true}
                  onChange={e => setEditData(prev => ({ ...prev, is_active: e.target.checked }))}
                  className="w-4 h-4"
                />
                <span className="text-sm">Karyawan aktif</span>
              </label>
            </div>
          )}
        </div>

        {/* Edit actions */}
        {editMode && (
          <div className="flex items-center gap-2 mt-4 pt-4 border-t border-[#1E2D3D]">
            {saveError && <span className="text-red-500 text-sm flex-1">{saveError}</span>}
            <button onClick={() => { setEditMode(false); setSaveError(null) }}
              className="px-4 py-2 border border-[#1E2D3D] text-gray-300 rounded-lg text-sm hover:bg-gray-800 ml-auto">
              Batal
            </button>
            <button onClick={handleSave} disabled={saving}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm disabled:opacity-50">
              {saving ? 'Menyimpan...' : 'Simpan'}
            </button>
          </div>
        )}
      </div>

      {/* ── SP Records ─────────────────────────────────────────────────────── */}
      <div className="bg-[#111827] border border-[#1E2D3D] rounded-xl p-6">
        <h2 className="font-medium text-lg mb-4 text-white">
          Riwayat Surat Peringatan
          <span className="ml-2 text-sm text-gray-500">({spRecords.length} total)</span>
        </h2>
        {spRecords.length === 0 ? (
          <p className="text-gray-500 text-sm">Tidak ada surat peringatan</p>
        ) : (
          <div className="space-y-2">
            {spRecords.map(sp => (
              <div key={sp.id}
                className="flex items-center justify-between p-3 border border-[#1E2D3D] rounded-lg">
                <div>
                  <span className={`text-sm font-medium px-2 py-0.5 rounded ${spColor[sp.level]}`}>
                    {sp.level}
                  </span>
                  <span className="ml-2 text-sm text-gray-300">{sp.sp_number}</span>
                </div>
                <div className="text-right text-xs text-gray-400">
                  <div>Diterbitkan: {new Date(sp.issued_at).toLocaleDateString('id-ID')}</div>
                  <div>Berlaku s/d: {new Date(sp.expires_at).toLocaleDateString('id-ID')}</div>
                </div>
                <span className={`text-xs px-2 py-1 rounded ${sp.is_active ? 'bg-red-500/20 text-red-500' : 'bg-gray-800 text-gray-400'}`}>
                  {sp.is_active ? 'Aktif' : 'Selesai'}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Violation History ──────────────────────────────────────────────── */}
      <div className="bg-[#111827] border border-[#1E2D3D] rounded-xl p-6">
        <h2 className="font-medium text-lg mb-4 text-white">
          Riwayat Pelanggaran APD
          <span className="ml-2 text-sm text-gray-500">({totalViol} total)</span>
        </h2>
        {violations.length === 0 ? (
          <p className="text-gray-500 text-sm">Tidak ada riwayat pelanggaran</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead>
                <tr className="text-gray-400 border-b border-[#1E2D3D]">
                  <th className="pb-2 font-medium">Kode</th>
                  <th className="pb-2 font-medium">APD Hilang</th>
                  <th className="pb-2 font-medium">Kamera</th>
                  <th className="pb-2 font-medium">Waktu</th>
                  <th className="pb-2 font-medium">Frame</th>
                </tr>
              </thead>
              <tbody>
                {violations.map(v => (
                  <tr key={v.id} className="border-b border-[#1E2D3D] last:border-0 hover:bg-[#1A2634]">
                    <td className="py-3 font-mono text-xs text-blue-400">{v.violation_code}</td>
                    <td className="py-3 text-gray-300">
                      {[v.missing_helm && 'Helm', v.missing_vest && 'Rompi', v.missing_shoes && 'Sepatu']
                        .filter(Boolean).join(', ')}
                    </td>
                    <td className="py-3 text-gray-300">{v.camera_id}</td>
                    <td className="py-3 text-gray-400">
                      {new Date(v.detected_at ?? v.created_at ?? '').toLocaleString('id-ID')}
                    </td>
                    <td className="py-3">
                      {v.frame_path ? (
                        <ViolationFrame
                          violationId={v.id}
                          hasFrame={true}
                          size="thumb"
                          className="w-10 h-10 object-cover rounded cursor-pointer border border-[#1E2D3D]"
                        />
                      ) : <span className="text-gray-600 text-xs">—</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {/* Pagination */}
        {totalViol > 10 && (
          <div className="flex justify-end gap-2 mt-4">
            <button disabled={currentPage === 1}
              onClick={() => setCurrentPage(p => p - 1)}
              className="px-3 py-1 border border-[#1E2D3D] text-gray-300 rounded text-sm disabled:opacity-40 hover:bg-[#1A2634]">
              ← Prev
            </button>
            <span className="px-3 py-1 text-sm text-gray-500 flex items-center">
              Hal {currentPage} / {Math.ceil(totalViol / 10)}
            </span>
            <button disabled={currentPage * 10 >= totalViol}
              onClick={() => setCurrentPage(p => p + 1)}
              className="px-3 py-1 border border-[#1E2D3D] text-gray-300 rounded text-sm disabled:opacity-40 hover:bg-[#1A2634]">
              Next →
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
