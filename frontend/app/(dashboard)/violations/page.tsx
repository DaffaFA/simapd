"use client";

import { useState, useEffect, useCallback } from 'react';
import { Search, Download, ExternalLink, Link2, X } from 'lucide-react';
import { HelmDot } from '@/components/shared/HelmDot';
import { APDChip } from '@/components/shared/APDChip';
import { LinkedBadge } from '@/components/shared/StatusBadge';
import { ViolationFrame } from '@/components/violations/ViolationFrame';
import { LinkPersonnelPanel } from '@/components/violations/LinkPersonnelPanel';
import { violationApi, analyticsApi, getViolationFrameUrl } from '@/src/lib/api';
import Link from 'next/link';
import { mapViolation } from '@/src/lib/mappers';
import type { Violation } from '@/components/shared/types';

export default function Violations() {
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterAPD, setFilterAPD] = useState('all');
  const [violations, setViolations] = useState<Violation[]>([]);
  const [loading, setLoading] = useState(true);
  const [linkingViolationId, setLinkingViolationId] = useState<string | null>(null);

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

  const handleLinkClick = (id: string) => {
    setLinkingViolationId(id);
  };

  const handleExport = async () => {
    try {
      await analyticsApi.exportCsv();
    } catch (err) {
      console.error('Export failed:', err);
    }
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
              {['Frame', 'ID Pelanggaran', 'Waktu', 'Track ID', 'Peran / Helm', 'APD Tidak Terpenuhi', 'Status', 'Personel', 'Aksi'].map(col => (
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
                <td colSpan={9} style={{ padding: 30, textAlign: 'center', fontSize: 13, fontFamily: 'DM Sans, sans-serif', color: '#64748B' }}>
                  Memuat data pelanggaran...
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={9} style={{ padding: 40, textAlign: 'center', fontSize: 13, fontFamily: 'DM Sans, sans-serif', color: '#64748B' }}>
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
      {selected && <DetailPanel violation={selected} onClose={() => setSelectedId(null)} />}
      {/* Link Personnel Modal */}
      {linkingViolationId && (
        <div 
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          onClick={e => { if (e.target === e.currentTarget) setLinkingViolationId(null); }}
        >
          <div style={{ background: '#111827', border: '1px solid #1E2D3D', borderRadius: 12, padding: 24, width: 460 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <h3 style={{ fontSize: 15, fontFamily: 'DM Sans, sans-serif', fontWeight: 700, color: '#E2E8F0', margin: 0 }}>
                Tautkan Personel
              </h3>
              <button onClick={() => setLinkingViolationId(null)} style={{ background: 'transparent', border: 'none', color: '#64748B', cursor: 'pointer' }}><X size={18} /></button>
            </div>
            <LinkPersonnelPanel violationId={linkingViolationId} onLinked={() => { setLinkingViolationId(null); fetchViolations(); }} />
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
        <ViolationFrame
          violationId={v.id}
          hasFrame={!!v.framePath}
          size="thumb"
        />
      </td>
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
        {v.personnelId ? (
          <Link
            href={`/personnel/${v.personnelId}`}
            style={{ fontSize: 12, fontFamily: 'DM Sans, sans-serif', fontWeight: 500, color: '#3B82F6', textDecoration: 'none' }}
            onClick={e => e.stopPropagation()}
            onMouseEnter={e => { (e.target as HTMLElement).style.textDecoration = 'underline'; }}
            onMouseLeave={e => { (e.target as HTMLElement).style.textDecoration = 'none'; }}
          >
            {v.personnelName ?? v.personnelId}
          </Link>
        ) : (
          <span style={{ fontSize: 12, fontFamily: 'DM Sans, sans-serif', color: '#64748B' }}>
            —
          </span>
        )}
      </td>
      <td style={{ padding: '10px 14px' }}>
        <div style={{ display: 'flex', gap: 6 }}>
          <button 
            onClick={(e) => { e.stopPropagation(); window.open(getViolationFrameUrl(v.id), '_blank'); }}
            style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 10px', borderRadius: 5, border: '1px solid rgba(59,130,246,0.3)', background: 'rgba(59,130,246,0.1)', color: '#3B82F6', fontSize: 11, fontFamily: 'DM Sans, sans-serif', cursor: 'pointer' }}
          >
            <ExternalLink size={11} />
            Frame
          </button>
          {!v.personnelId && (
            <button 
              onClick={(e) => { e.stopPropagation(); onLinkClick(); }}
              style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 10px', borderRadius: 5, border: '1px solid rgba(16,185,129,0.3)', background: 'rgba(16,185,129,0.1)', color: '#10B981', fontSize: 11, fontFamily: 'DM Sans, sans-serif', cursor: 'pointer' }}
            >
              <Link2 size={11} />
              Link
            </button>
          )}
        </div>
      </td>
    </tr>
  );
}

function DetailPanel({ violation: v, onClose }: { violation: Violation; onClose: () => void }) {
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

      {/* Frame thumbnail placeholder / image */}
      <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
        <div style={{ width: 300, flexShrink: 0 }}>
          <ViolationFrame
            violationId={v.id}
            hasFrame={!!v.framePath}
            size="full"
          />
        </div>

      </div>

      {/* Link Personnel Panel */}
      <div style={{ marginTop: 16, borderTop: '1px solid #1E2D3D', paddingTop: 16 }}>
        <h3 style={{ fontSize: 13, fontFamily: 'DM Sans, sans-serif', fontWeight: 600, color: '#E2E8F0', marginBottom: 12 }}>
          Tautan Karyawan
        </h3>
        <LinkPersonnelPanel
          violationId={v.id}
        />
      </div>
    </div>
  );
}
