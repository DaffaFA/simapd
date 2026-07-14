"use client";

import { useState, useEffect, useCallback } from 'react';
import { Search, Download, ExternalLink, Link2 } from 'lucide-react';
import { HelmDot } from '@/components/shared/HelmDot';
import { APDChip } from '@/components/shared/APDChip';
import { LinkedBadge } from '@/components/shared/StatusBadge';
import { violationApi, analyticsApi, personnelApi } from '@/src/lib/api';
import { mapViolation } from '@/src/lib/mappers';
import type { Violation } from '@/components/shared/types';

export default function Violations() {
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterAPD, setFilterAPD] = useState('all');
  const [violations, setViolations] = useState<Violation[]>([]);
  const [loading, setLoading] = useState(true);
  const [linkingId, setLinkingId] = useState<string | null>(null);
  const [personnelList, setPersonnelList] = useState<{ id: string; name: string }[]>([]);

  const fetchViolations = useCallback(async () => {
    try {
      const res = await violationApi.list({ page_size: '100' });
      setViolations(res.items.map(mapViolation));
    } catch (err) {
      console.error('Failed to fetch violations:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchViolations(); }, [fetchViolations]);

  const filtered = violations.filter(v => {
    const matchSearch = v.id.toLowerCase().includes(search.toLowerCase())
      || v.trackId.toLowerCase().includes(search.toLowerCase())
      || (v.personnelName?.toLowerCase().includes(search.toLowerCase()) ?? false);
    const matchStatus = filterStatus === 'all' || v.status === filterStatus;
    const matchAPD = filterAPD === 'all' || v.apdMissing.includes(filterAPD as 'Helm' | 'Rompi' | 'Sepatu');
    return matchSearch && matchStatus && matchAPD;
  });

  const selected = filtered.find(v => v.id === selectedId);

  const handleExport = async () => {
    try {
      await analyticsApi.exportCsv();
    } catch (err) {
      console.error('Export failed:', err);
    }
  };

  const handleLinkClick = async (violationId: string) => {
    try {
      const res = await personnelApi.list({ page_size: '100' });
      setPersonnelList(res.items.map(p => ({ id: p.id, name: p.full_name })));
      setLinkingId(violationId);
    } catch (err) {
      console.error('Failed to fetch personnel for linking:', err);
    }
  };

  const handleLinkConfirm = async (personnelId: string) => {
    if (!linkingId) return;
    // Find the original violation ID (UUID) from our mapped violations
    try {
      const apiViolations = await violationApi.list({ page_size: '100' });
      const original = apiViolations.items.find(v => v.violation_code === linkingId || v.id === linkingId);
      if (original) {
        await violationApi.link(original.id, { personnel_id: personnelId });
        await fetchViolations();
      }
    } catch (err) {
      console.error('Link failed:', err);
    }
    setLinkingId(null);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Filter Bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          background: '#111827',
          border: '1px solid #1E2D3D',
          borderRadius: 10,
          padding: '10px 16px',
          flexWrap: 'wrap',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 200, background: '#0D1117', border: '1px solid #1E2D3D', borderRadius: 6, padding: '6px 12px' }}>
          <Search size={13} color="#64748B" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Cari ID, Track ID, atau nama..."
            style={{ background: 'transparent', border: 'none', outline: 'none', fontSize: 12, fontFamily: 'DM Sans, sans-serif', color: '#E2E8F0', width: '100%' }}
          />
        </div>

        {[
          { label: 'Status', value: filterStatus, onChange: setFilterStatus, options: [['all','Semua Status'],['linked','Linked'],['unlinked','Unlinked']] },
          { label: 'Jenis APD', value: filterAPD, onChange: setFilterAPD, options: [['all','Semua APD'],['Helm','Helm'],['Rompi','Rompi'],['Sepatu','Sepatu']] },
        ].map(({ label, value, onChange, options }) => (
          <select
            key={label}
            value={value}
            onChange={e => onChange(e.target.value)}
            style={{ background: '#0D1117', border: '1px solid #1E2D3D', borderRadius: 6, padding: '6px 10px', fontSize: 12, fontFamily: 'DM Sans, sans-serif', color: '#94A3B8', cursor: 'pointer', outline: 'none' }}
          >
            {options.map(([val, lbl]) => <option key={val} value={val}>{lbl}</option>)}
          </select>
        ))}

        <button onClick={handleExport} style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6, padding: '6px 14px', borderRadius: 6, border: '1px solid #1E2D3D', background: 'transparent', color: '#94A3B8', fontSize: 12, fontFamily: 'DM Sans, sans-serif', cursor: 'pointer' }}>
          <Download size={13} />
          Export
        </button>
      </div>

      {/* Table */}
      <div style={{ background: '#111827', border: '1px solid #1E2D3D', borderRadius: 10, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #1E2D3D' }}>
              {['ID Pelanggaran', 'Waktu', 'Track ID', 'Peran / Helm', 'APD Tidak Terpenuhi', 'Status', 'Personel', 'Aksi'].map(col => (
                <th
                  key={col}
                  style={{
                    padding: '10px 14px',
                    textAlign: 'left',
                    fontSize: 10,
                    fontFamily: 'DM Sans, sans-serif',
                    fontWeight: 600,
                    color: '#64748B',
                    textTransform: 'uppercase',
                    letterSpacing: '0.08em',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={8} style={{ padding: 30, textAlign: 'center', fontSize: 13, fontFamily: 'DM Sans, sans-serif', color: '#64748B' }}>
                  Memuat data pelanggaran...
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={8} style={{ padding: 40, textAlign: 'center', fontSize: 13, fontFamily: 'DM Sans, sans-serif', color: '#64748B' }}>
                  Tidak ada pelanggaran yang cocok dengan filter
                </td>
              </tr>
            ) : (
              filtered.map(v => (
                <ViolationRow
                  key={v.id}
                  v={v}
                  isSelected={v.id === selectedId}
                  onClick={() => setSelectedId(selectedId === v.id ? null : v.id)}
                  onLinkClick={() => handleLinkClick(v.id)}
                />
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Detail Panel */}
      {selected && <DetailPanel violation={selected} onClose={() => setSelectedId(null)} onLinkClick={() => handleLinkClick(selected.id)} />}

      {/* Link Modal */}
      {linkingId && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          onClick={e => { if (e.target === e.currentTarget) setLinkingId(null); }}
        >
          <div style={{ background: '#111827', border: '1px solid #1E2D3D', borderRadius: 12, padding: 24, width: 400, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <h3 style={{ fontSize: 15, fontFamily: 'DM Sans, sans-serif', fontWeight: 700, color: '#E2E8F0', margin: 0 }}>Tautkan ke Personel</h3>
            <p style={{ fontSize: 12, color: '#64748B', margin: 0 }}>Pelanggaran: {linkingId}</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 200, overflowY: 'auto' }}>
              {personnelList.map(p => (
                <button
                  key={p.id}
                  onClick={() => handleLinkConfirm(p.id)}
                  style={{ padding: '8px 12px', borderRadius: 6, border: '1px solid #1E2D3D', background: 'transparent', color: '#E2E8F0', fontSize: 13, fontFamily: 'DM Sans, sans-serif', cursor: 'pointer', textAlign: 'left', transition: 'background 0.15s' }}
                  onMouseEnter={e => { (e.target as HTMLElement).style.background = 'rgba(249,115,22,0.1)'; }}
                  onMouseLeave={e => { (e.target as HTMLElement).style.background = 'transparent'; }}
                >
                  {p.name}
                </button>
              ))}
            </div>
            <button onClick={() => setLinkingId(null)} style={{ padding: '8px', borderRadius: 6, border: '1px solid #1E2D3D', background: 'transparent', color: '#94A3B8', fontSize: 12, cursor: 'pointer' }}>
              Batal
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function ViolationRow({ v, isSelected, onClick, onLinkClick }: { v: Violation; isSelected: boolean; onClick: () => void; onLinkClick: () => void }) {
  return (
    <tr
      onClick={onClick}
      style={{
        borderBottom: '1px solid #1E2D3D',
        background: isSelected ? 'rgba(249,115,22,0.05)' : 'transparent',
        cursor: 'pointer',
        transition: 'background 0.15s',
      }}
      onMouseEnter={e => { if (!isSelected) (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.02)'; }}
      onMouseLeave={e => { if (!isSelected) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
    >
      <td style={{ padding: '10px 14px' }}>
        <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12, color: '#F97316' }}>{v.id}</span>
      </td>
      <td style={{ padding: '10px 14px' }}>
        <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12, color: '#64748B' }}>{v.time}</span>
      </td>
      <td style={{ padding: '10px 14px' }}>
        <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12, color: '#94A3B8' }}>{v.trackId}</span>
      </td>
      <td style={{ padding: '10px 14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <HelmDot color={v.helmColor} />
          <span style={{ fontSize: 12, fontFamily: 'DM Sans, sans-serif', color: '#E2E8F0' }}>{v.role}</span>
        </div>
      </td>
      <td style={{ padding: '10px 14px' }}>
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          {v.apdMissing.map(apd => <APDChip key={apd} item={apd} />)}
        </div>
      </td>
      <td style={{ padding: '10px 14px' }}>
        <LinkedBadge status={v.status} />
      </td>
      <td style={{ padding: '10px 14px' }}>
        <span style={{ fontSize: 12, fontFamily: 'DM Sans, sans-serif', color: v.personnelName ? '#E2E8F0' : '#64748B' }}>
          {v.personnelName ?? '—'}
        </span>
      </td>
      <td style={{ padding: '10px 14px' }}>
        <div style={{ display: 'flex', gap: 6 }}>
          <button style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 10px', borderRadius: 5, border: '1px solid rgba(59,130,246,0.3)', background: 'rgba(59,130,246,0.1)', color: '#3B82F6', fontSize: 11, fontFamily: 'DM Sans, sans-serif', cursor: 'pointer' }}>
            <ExternalLink size={11} />
            Frame
          </button>
          {v.status === 'unlinked' && (
            <button
              onClick={e => { e.stopPropagation(); onLinkClick(); }}
              style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 10px', borderRadius: 5, border: '1px solid rgba(249,115,22,0.3)', background: 'rgba(249,115,22,0.1)', color: '#F97316', fontSize: 11, fontFamily: 'DM Sans, sans-serif', cursor: 'pointer' }}
            >
              <Link2 size={11} />
              Tautkan
            </button>
          )}
        </div>
      </td>
    </tr>
  );
}

function DetailPanel({ violation: v, onClose, onLinkClick }: { violation: Violation; onClose: () => void; onLinkClick: () => void }) {
  const fields = [
    { label: 'Track ID', value: v.trackId, mono: true },
    { label: 'ID Pelanggaran', value: v.id, mono: true },
    { label: 'Waktu', value: v.time, mono: true },
    { label: 'Kamera', value: `${v.cameraId} · ${v.zone}`, mono: true },
    { label: 'Peran', value: v.role },
    { label: 'Personel', value: v.personnelName ?? 'Belum ditautkan' },
  ];

  return (
    <div
      style={{
        background: '#111827',
        border: '1px solid #1E2D3D',
        borderRadius: 10,
        padding: 20,
        display: 'flex',
        flexDirection: 'column',
        gap: 16,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h3 style={{ fontSize: 13, fontFamily: 'DM Sans, sans-serif', fontWeight: 600, color: '#E2E8F0', margin: 0, textTransform: 'uppercase', letterSpacing: '0.07em' }}>
          Detail Pelanggaran — {v.id}
        </h3>
        <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: '#64748B', cursor: 'pointer', fontSize: 16 }}>✕</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
        {fields.map(f => (
          <div key={f.label} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span style={{ fontSize: 10, fontFamily: 'DM Sans, sans-serif', fontWeight: 600, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{f.label}</span>
            <span style={{ fontSize: 13, fontFamily: f.mono ? 'JetBrains Mono, monospace' : 'DM Sans, sans-serif', color: f.mono ? '#94A3B8' : '#E2E8F0' }}>{f.value}</span>
          </div>
        ))}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <span style={{ fontSize: 10, fontFamily: 'DM Sans, sans-serif', fontWeight: 600, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.08em' }}>APD Missing</span>
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
            {v.apdMissing.map(apd => <APDChip key={apd} item={apd} />)}
          </div>
        </div>
      </div>

      {/* Frame thumbnail placeholder */}
      <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
        <div
          style={{
            width: 200,
            height: 120,
            background: '#0D1117',
            border: '1px solid #1E2D3D',
            borderRadius: 6,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'column',
            gap: 4,
            flexShrink: 0,
          }}
        >
          <span style={{ fontSize: 24, opacity: 0.3 }}>📷</span>
          <span style={{ fontSize: 10, fontFamily: 'JetBrains Mono, monospace', color: '#64748B' }}>Frame capture</span>
        </div>

        {v.status === 'unlinked' && (
          <button
            onClick={onLinkClick}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '10px 20px',
              borderRadius: 8,
              border: 'none',
              background: '#F97316',
              color: '#fff',
              fontSize: 13,
              fontFamily: 'DM Sans, sans-serif',
              fontWeight: 600,
              cursor: 'pointer',
              alignSelf: 'flex-end',
            }}
          >
            <Link2 size={15} />
            Tautkan ke Personel
          </button>
        )}
      </div>
    </div>
  );
}
