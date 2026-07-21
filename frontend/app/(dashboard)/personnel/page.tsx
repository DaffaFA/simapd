"use client";

import { useState, useEffect, useCallback } from 'react';
import { Search, Plus, Edit2, Eye, X } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { HelmDot } from '@/components/shared/HelmDot';
import { SPBadge } from '@/components/shared/StatusBadge';
import { MiniProgressBar } from '@/components/shared/MiniProgressBar';
import { personnelApi } from '@/src/lib/api';
import { mapPersonnel } from '@/src/lib/mappers';
import type { Personnel } from '@/components/shared/types';

export default function PersonnelPage() {
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingPersonnel, setEditingPersonnel] = useState<Personnel | null>(null);
  const [personnel, setPersonnel] = useState<Personnel[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPersonnel = useCallback(async () => {
    try {
      const res = await personnelApi.list({ page_size: '100' });
      setPersonnel(res.items.map(mapPersonnel));
    } catch (err) {
      console.error('Failed to fetch personnel:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchPersonnel(); }, [fetchPersonnel]);

  const filtered = personnel.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.employeeId.toLowerCase().includes(search.toLowerCase()) ||
    p.department.toLowerCase().includes(search.toLowerCase())
  );

  const sp1Count = personnel.filter(p => p.sp === 'SP1').length;
  const sp2Count = personnel.filter(p => p.sp === 'SP2').length;
  const sp3Count = personnel.filter(p => p.sp === 'SP3').length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Toolbar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#111827', border: '1px solid #1E2D3D', borderRadius: 8, padding: '7px 12px', flex: 1, maxWidth: 360 }}>
          <Search size={13} color="#64748B" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Cari nama, ID, atau departemen..."
            style={{ background: 'transparent', border: 'none', outline: 'none', fontSize: 12, fontFamily: 'DM Sans, sans-serif', color: '#E2E8F0', width: '100%' }}
          />
        </div>
        <button
          onClick={() => { setEditingPersonnel(null); setShowModal(true); }}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 8, border: 'none', background: '#F97316', color: '#fff', fontSize: 13, fontFamily: 'DM Sans, sans-serif', fontWeight: 600, cursor: 'pointer', marginLeft: 'auto' }}
        >
          <Plus size={15} />
          Tambah Personel
        </button>
      </div>

      {/* Table */}
      <div style={{ background: '#111827', border: '1px solid #1E2D3D', borderRadius: 10, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #1E2D3D' }}>
              {['ID', 'Nama', 'Peran / Helm', 'Departemen', 'Surat Peringatan', 'Total Pelanggaran', 'Aksi'].map(col => (
                <th key={col} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 10, fontFamily: 'DM Sans, sans-serif', fontWeight: 600, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.08em', whiteSpace: 'nowrap' }}>
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} style={{ padding: 30, textAlign: 'center', fontSize: 13, fontFamily: 'DM Sans, sans-serif', color: '#64748B' }}>
                  Memuat data personel...
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ padding: 30, textAlign: 'center', fontSize: 13, fontFamily: 'DM Sans, sans-serif', color: '#64748B' }}>
                  Tidak ada personel yang cocok
                </td>
              </tr>
            ) : (
              filtered.map(p => (
                <PersonnelRow key={p.id} p={p} onEdit={() => { setEditingPersonnel(p); setShowModal(true); }} />
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* SP Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
        {[
          { level: 'SP1', count: sp1Count, desc: 'Akumulasi 3–6 pelanggaran', color: '#F59E0B', bg: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.2)' },
          { level: 'SP2', count: sp2Count, desc: 'Akumulasi 7–11 pelanggaran', color: '#EF4444', bg: 'rgba(239,68,68,0.08)', border: 'rgba(239,68,68,0.2)' },
          { level: 'SP3', count: sp3Count, desc: 'Akumulasi ≥12 pelanggaran', color: '#A78BFA', bg: 'rgba(167,139,250,0.08)', border: 'rgba(167,139,250,0.2)' },
        ].map(({ level, count, desc, color, border }) => (
          <div key={level} style={{ background: '#111827', border: `1px solid ${border}`, borderRadius: 10, padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 11, fontFamily: 'DM Sans, sans-serif', fontWeight: 600, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.07em' }}>{level} Aktif</span>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: color }} />
            </div>
            <span style={{ fontSize: 32, fontFamily: 'JetBrains Mono, monospace', fontWeight: 500, color: color, lineHeight: 1 }}>{count}</span>
            <span style={{ fontSize: 12, fontFamily: 'DM Sans, sans-serif', color: '#64748B' }}>{desc}</span>
          </div>
        ))}
      </div>

      {showModal && <PersonnelModal initialData={editingPersonnel} onClose={() => { setShowModal(false); setEditingPersonnel(null); }} onSaved={fetchPersonnel} />}
    </div>
  );
}

function PersonnelRow({ p, onEdit }: { p: Personnel; onEdit: () => void }) {
  const router = useRouter();
  return (
    <tr
      style={{ borderBottom: '1px solid #1E2D3D', transition: 'background 0.15s' }}
      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.02)'; }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
    >
      <td style={{ padding: '10px 14px' }}>
        <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: '#64748B' }}>{p.employeeId}</span>
      </td>
      <td style={{ padding: '10px 14px' }}>
        <Link
          href={`/personnel/${p.id}`}
          style={{ fontSize: 13, fontFamily: 'DM Sans, sans-serif', fontWeight: 600, color: '#3B82F6', textDecoration: 'none' }}
          onMouseEnter={e => { (e.target as HTMLElement).style.textDecoration = 'underline'; }}
          onMouseLeave={e => { (e.target as HTMLElement).style.textDecoration = 'none'; }}
        >
          {p.name}
        </Link>
      </td>
      <td style={{ padding: '10px 14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <HelmDot color={p.helmColor} />
          <span style={{ fontSize: 12, fontFamily: 'DM Sans, sans-serif', color: '#94A3B8' }}>{p.role}</span>
        </div>
      </td>
      <td style={{ padding: '10px 14px' }}>
        <span style={{ fontSize: 12, fontFamily: 'DM Sans, sans-serif', color: '#94A3B8' }}>{p.department}</span>
      </td>
      <td style={{ padding: '10px 14px' }}>
        <SPBadge level={p.sp} />
        {!p.sp && <span style={{ fontSize: 12, fontFamily: 'DM Sans, sans-serif', color: '#64748B' }}>—</span>}
      </td>
      <td style={{ padding: '10px 14px', minWidth: 140 }}>
        <MiniProgressBar value={p.totalViolations} />
      </td>
      <td style={{ padding: '10px 14px' }}>
        <div style={{ display: 'flex', gap: 6 }}>
          <button onClick={() => router.push(`/personnel/${p.id}`)} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 10px', borderRadius: 5, border: '1px solid #1E2D3D', background: 'transparent', color: '#94A3B8', fontSize: 11, fontFamily: 'DM Sans, sans-serif', cursor: 'pointer', textDecoration: 'none' }}>
            <Eye size={11} />
            Detail
          </button>
          <button onClick={onEdit} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 10px', borderRadius: 5, border: '1px solid rgba(249,115,22,0.25)', background: 'rgba(249,115,22,0.08)', color: '#F97316', fontSize: 11, fontFamily: 'DM Sans, sans-serif', cursor: 'pointer' }}>
            <Edit2 size={11} />
            Edit
          </button>
        </div>
      </td>
    </tr>
  );
}

function PersonnelModal({ initialData, onClose, onSaved }: { initialData?: Personnel | null; onClose: () => void; onSaved: () => void }) {
  const [fullName, setFullName] = useState(initialData?.name || '');
  const [employeeId, setEmployeeId] = useState(initialData?.employeeId || '');
  const [department, setDepartment] = useState(initialData?.department || '');
  const [role, setRole] = useState(initialData?.role || 'Pekerja');
  const [helmColor, setHelmColor] = useState(initialData?.helmColor || 'Kuning');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSave = async () => {
    if (!fullName || !employeeId) {
      setError('Nama dan ID wajib diisi');
      return;
    }
    setSaving(true);
    setError('');
    try {
      if (initialData) {
        await personnelApi.update(initialData.id, {
          full_name: fullName,
          employee_id: employeeId,
          department: department || 'Umum',
          role: role as 'Pekerja' | 'Supervisor' | 'Safety Officer',
          helm_color: helmColor as 'Kuning' | 'Putih' | 'Hijau',
        });
      } else {
        await personnelApi.create({
          full_name: fullName,
          employee_id: employeeId,
          department: department || 'Umum',
          role: role as 'Pekerja' | 'Supervisor' | 'Safety Officer',
          helm_color: helmColor as 'Kuning' | 'Putih' | 'Hijau',
        });
      }
      onSaved();
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal menyimpan';
      setError(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{ background: '#111827', border: '1px solid #1E2D3D', borderRadius: 12, padding: 24, width: 460, display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h3 style={{ fontSize: 15, fontFamily: 'DM Sans, sans-serif', fontWeight: 700, color: '#E2E8F0', margin: 0 }}>{initialData ? 'Edit Personel' : 'Tambah Personel'}</h3>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: '#64748B', cursor: 'pointer' }}><X size={18} /></button>
        </div>

        {error && (
          <div style={{ padding: '8px 12px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 6 }}>
            <p style={{ fontSize: 12, color: '#EF4444', margin: 0 }}>{error}</p>
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{ fontSize: 11, fontFamily: 'DM Sans, sans-serif', fontWeight: 600, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Nama Lengkap</label>
            <input
              value={fullName} onChange={e => setFullName(e.target.value)}
              placeholder="Masukkan nama..."
              style={{ background: '#0D1117', border: '1px solid #1E2D3D', borderRadius: 6, padding: '8px 12px', fontSize: 12, fontFamily: 'DM Sans, sans-serif', color: '#E2E8F0', outline: 'none' }}
            />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{ fontSize: 11, fontFamily: 'DM Sans, sans-serif', fontWeight: 600, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.07em' }}>ID Karyawan</label>
            <input
              value={employeeId} onChange={e => setEmployeeId(e.target.value)}
              placeholder="EMP-XXX"
              style={{ background: '#0D1117', border: '1px solid #1E2D3D', borderRadius: 6, padding: '8px 12px', fontSize: 12, fontFamily: 'DM Sans, sans-serif', color: '#E2E8F0', outline: 'none' }}
            />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{ fontSize: 11, fontFamily: 'DM Sans, sans-serif', fontWeight: 600, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Departemen</label>
            <input
              value={department} onChange={e => setDepartment(e.target.value)}
              placeholder="Bongkar Muat"
              style={{ background: '#0D1117', border: '1px solid #1E2D3D', borderRadius: 6, padding: '8px 12px', fontSize: 12, fontFamily: 'DM Sans, sans-serif', color: '#E2E8F0', outline: 'none' }}
            />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{ fontSize: 11, fontFamily: 'DM Sans, sans-serif', fontWeight: 600, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Peran</label>
            <select value={role} onChange={e => setRole(e.target.value)} style={{ background: '#0D1117', border: '1px solid #1E2D3D', borderRadius: 6, padding: '8px 12px', fontSize: 12, fontFamily: 'DM Sans, sans-serif', color: '#E2E8F0', outline: 'none', cursor: 'pointer' }}>
              <option>Pekerja</option>
              <option>Supervisor</option>
              <option>Safety Officer</option>
            </select>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{ fontSize: 11, fontFamily: 'DM Sans, sans-serif', fontWeight: 600, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Warna Helm</label>
            <select value={helmColor} onChange={e => setHelmColor(e.target.value)} style={{ background: '#0D1117', border: '1px solid #1E2D3D', borderRadius: 6, padding: '8px 12px', fontSize: 12, fontFamily: 'DM Sans, sans-serif', color: '#E2E8F0', outline: 'none', cursor: 'pointer' }}>
              <option value="Kuning">Kuning — Pekerja</option>
              <option value="Putih">Putih — Supervisor</option>
              <option value="Hijau">Hijau — Safety Officer</option>
            </select>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
          <button onClick={onClose} style={{ flex: 1, padding: '10px', borderRadius: 8, border: '1px solid #1E2D3D', background: 'transparent', color: '#94A3B8', fontSize: 13, fontFamily: 'DM Sans, sans-serif', cursor: 'pointer' }}>
            Batal
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            style={{ flex: 2, padding: '10px', borderRadius: 8, border: 'none', background: saving ? 'rgba(249,115,22,0.5)' : '#F97316', color: '#fff', fontSize: 13, fontFamily: 'DM Sans, sans-serif', fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer' }}
          >
            {saving ? 'Menyimpan...' : 'Simpan Personel'}
          </button>
        </div>
      </div>
    </div>
  );
}
