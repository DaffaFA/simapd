"use client";

import { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, Cell, ResponsiveContainer } from 'recharts';
import { FileDown, Printer, Download } from 'lucide-react';
import { HelmDot } from '@/components/shared/HelmDot';
import { analyticsApi } from '@/src/lib/api';

interface TrendDay { date: string; total_violations: number; compliance_rate: number }
interface ByType { helm: number; vest: number; shoes: number; helm_pct: number; vest_pct: number; shoes_pct: number }
interface ByShift { pagi: number; siang: number; malam: number }
interface Offender { personnel_id: string; full_name: string; employee_id: string; role: string; violation_count: number }
interface DashboardData {
  summary: { compliance_rate: number; total_violations_today: number; total_violations_week: number };
  trend: TrendDay[];
  byType: ByType;
  byShift: ByShift;
  offenders: Offender[];
}

const periods = ['7 Hari', '1 Bulan', '3 Bulan', 'Kustom'];

function HorizontalBar({ label, pct, color }: { label: string; pct: number; color: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 12, fontFamily: 'DM Sans, sans-serif', color: '#94A3B8' }}>{label}</span>
        <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12, color: color, fontWeight: 500 }}>{pct}%</span>
      </div>
      <div style={{ height: 6, background: '#1E2D3D', borderRadius: 3, overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 3, transition: 'width 0.6s ease' }} />
      </div>
    </div>
  );
}

interface ChartTooltipProps {
  active?: boolean;
  payload?: Array<{ value: number; name: string }>;
  label?: string;
}

function CustomTooltip({ active, payload, label }: ChartTooltipProps) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: '#1E293B', border: '1px solid #1E2D3D', borderRadius: 6, padding: '8px 12px' }}>
      <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 11, color: '#64748B', margin: '0 0 4px' }}>{label}</p>
      <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 13, color: '#22C55E', margin: 0 }}>{payload[0].value}% compliant</p>
    </div>
  );
}

const roleHelmMap: Record<string, 'yellow' | 'white' | 'green'> = {
  'Pekerja': 'yellow',
  'Supervisor': 'white',
  'Safety Officer': 'green',
};

export default function Analytics() {
  const [period, setPeriod] = useState('7 Hari');
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const daysMap: Record<string, number> = { '7 Hari': 7, '1 Bulan': 30, '3 Bulan': 90, 'Kustom': 7 };
        const res = await analyticsApi.dashboard({ days: String(daysMap[period] ?? 7) });
        setData(res);
      } catch (err) {
        console.error('Analytics load failed:', err);
      } finally {
        setLoading(false);
      }
    }
    setLoading(true);
    load();
  }, [period]);

  const trend = data?.trend ?? [];
  const chartData = trend.map(t => ({
    day: t.date.slice(5), // MM-DD
    compliance: t.compliance_rate,
    violations: t.total_violations,
  }));

  const byType = data?.byType;
  const apdBreakdown = byType ? [
    { label: 'Rompi', pct: byType.vest_pct, color: '#EF4444' },
    { label: 'Helm', pct: byType.helm_pct, color: '#F59E0B' },
    { label: 'Sepatu', pct: byType.shoes_pct, color: '#3B82F6' },
  ] : [];

  const byShift = data?.byShift;
  const shiftTotal = byShift ? (byShift.pagi + byShift.siang + byShift.malam) || 1 : 1;
  const shiftBreakdown = byShift ? [
    { label: 'Pagi (07–15)', pct: Math.round(byShift.pagi / shiftTotal * 100), color: '#F97316' },
    { label: 'Siang (15–23)', pct: Math.round(byShift.siang / shiftTotal * 100), color: '#F59E0B' },
    { label: 'Malam (23–07)', pct: Math.round(byShift.malam / shiftTotal * 100), color: '#3B82F6' },
  ] : [];

  const highestShift = shiftBreakdown.length > 0
    ? shiftBreakdown.reduce((a, b) => a.pct > b.pct ? a : b).label
    : 'Pagi (07–15)';

  const avgCompliance = data?.summary?.compliance_rate ?? 0;
  const offenders = data?.offenders ?? [];

  const handleExportPdf = async () => {
    try { await analyticsApi.exportPdf(); } catch (err) { console.error('PDF export failed:', err); }
  };

  const handleExportCsv = async () => {
    try { await analyticsApi.exportCsv(); } catch (err) { console.error('CSV export failed:', err); }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 60 }}>
        <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 13, color: '#64748B' }}>Memuat data analitik...</span>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Period selector + export */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ display: 'flex', gap: 4, background: '#111827', border: '1px solid #1E2D3D', borderRadius: 8, padding: 4 }}>
          {periods.map(p => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              style={{
                padding: '6px 14px',
                borderRadius: 6,
                border: 'none',
                background: period === p ? '#F97316' : 'transparent',
                color: period === p ? '#fff' : '#64748B',
                fontSize: 12,
                fontFamily: 'DM Sans, sans-serif',
                fontWeight: period === p ? 600 : 400,
                cursor: 'pointer',
                transition: 'all 0.15s',
              }}
            >
              {p}
            </button>
          ))}
        </div>

        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
          <button onClick={handleExportCsv} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 7, border: '1px solid #1E2D3D', background: 'transparent', color: '#94A3B8', fontSize: 12, fontFamily: 'DM Sans, sans-serif', cursor: 'pointer' }}>
            <Printer size={13} />
            Export CSV
          </button>
          <button onClick={handleExportPdf} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 7, border: 'none', background: '#F97316', color: '#fff', fontSize: 12, fontFamily: 'DM Sans, sans-serif', fontWeight: 600, cursor: 'pointer' }}>
            <FileDown size={13} />
            Export PDF
          </button>
        </div>
      </div>

      {/* Compliance Trend Chart */}
      <div style={{ background: '#111827', border: '1px solid #1E2D3D', borderRadius: 10, padding: '20px 24px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 }}>
          <div>
            <p style={{ fontSize: 11, fontFamily: 'DM Sans, sans-serif', fontWeight: 600, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 4px' }}>
              Tren Kepatuhan APD
            </p>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
              <span style={{ fontSize: 32, fontFamily: 'JetBrains Mono, monospace', fontWeight: 500, color: '#22C55E', lineHeight: 1 }}>{avgCompliance}%</span>
              <span style={{ fontSize: 12, fontFamily: 'DM Sans, sans-serif', color: '#64748B' }}>Rata-rata periode ini</span>
            </div>
          </div>
        </div>
        {chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={chartData} barCategoryGap="35%">
              <XAxis
                dataKey="day"
                tick={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, fill: '#64748B' }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                domain={[0, 100]}
                tick={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, fill: '#64748B' }}
                axisLine={false}
                tickLine={false}
                tickFormatter={v => `${v}%`}
                width={40}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
              <Bar dataKey="compliance" radius={[4, 4, 0, 0]} label={{ position: 'top', fontFamily: 'JetBrains Mono, monospace', fontSize: 10, fill: '#64748B', formatter: (v: number) => `${v}%` }}>
                {chartData.map((entry, i) => {
                  const isLast = i === chartData.length - 1;
                  return (
                    <Cell
                      key={i}
                      fill={isLast ? '#F97316' : entry.compliance >= 78 ? '#22C55E' : '#F97316'}
                      opacity={isLast ? 1 : 0.75}
                    />
                  );
                })}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div style={{ padding: 40, textAlign: 'center', fontSize: 13, color: '#64748B' }}>Belum ada data tren</div>
        )}
      </div>

      {/* Breakdown 2-col */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div style={{ background: '#111827', border: '1px solid #1E2D3D', borderRadius: 10, padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          <h3 style={{ fontSize: 12, fontFamily: 'DM Sans, sans-serif', fontWeight: 700, color: '#E2E8F0', margin: 0, textTransform: 'uppercase', letterSpacing: '0.07em' }}>
            Distribusi per Jenis APD
          </h3>
          {apdBreakdown.length > 0 ? apdBreakdown.map(b => <HorizontalBar key={b.label} {...b} />) : (
            <span style={{ fontSize: 12, color: '#64748B' }}>Belum ada data</span>
          )}
        </div>
        <div style={{ background: '#111827', border: '1px solid #1E2D3D', borderRadius: 10, padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          <h3 style={{ fontSize: 12, fontFamily: 'DM Sans, sans-serif', fontWeight: 700, color: '#E2E8F0', margin: 0, textTransform: 'uppercase', letterSpacing: '0.07em' }}>
            Distribusi per Shift
          </h3>
          {shiftBreakdown.length > 0 ? shiftBreakdown.map(b => <HorizontalBar key={b.label} {...b} />) : (
            <span style={{ fontSize: 12, color: '#64748B' }}>Belum ada data</span>
          )}
          {shiftBreakdown.length > 0 && (
            <div style={{ marginTop: 4, padding: '8px 12px', background: 'rgba(249,115,22,0.07)', border: '1px solid rgba(249,115,22,0.2)', borderRadius: 6 }}>
              <span style={{ fontSize: 11, fontFamily: 'DM Sans, sans-serif', color: '#F97316' }}>
                ⚠ Shift dengan pelanggaran tertinggi: <strong>{highestShift}</strong>
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Per-employee table */}
      <div style={{ background: '#111827', border: '1px solid #1E2D3D', borderRadius: 10, overflow: 'hidden' }}>
        <div style={{ padding: '14px 20px', borderBottom: '1px solid #1E2D3D', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h3 style={{ fontSize: 12, fontFamily: 'DM Sans, sans-serif', fontWeight: 700, color: '#E2E8F0', margin: 0, textTransform: 'uppercase', letterSpacing: '0.07em' }}>
            Top Pelanggar
          </h3>
          <button onClick={handleExportCsv} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 12px', borderRadius: 6, border: '1px solid #1E2D3D', background: 'transparent', color: '#94A3B8', fontSize: 11, fontFamily: 'DM Sans, sans-serif', cursor: 'pointer' }}>
            <Download size={12} />
            Export CSV
          </button>
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #1E2D3D' }}>
              {['Nama', 'Peran', 'Pelanggaran'].map(col => (
                <th key={col} style={{ padding: '9px 14px', textAlign: 'left', fontSize: 10, fontFamily: 'DM Sans, sans-serif', fontWeight: 600, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{col}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {offenders.length === 0 ? (
              <tr>
                <td colSpan={3} style={{ padding: 30, textAlign: 'center', fontSize: 13, color: '#64748B' }}>Belum ada data pelanggar</td>
              </tr>
            ) : (
              offenders.map(p => (
                <tr
                  key={p.personnel_id}
                  style={{ borderBottom: '1px solid #1E2D3D' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.02)'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                >
                  <td style={{ padding: '9px 14px' }}>
                    <span style={{ fontSize: 13, fontFamily: 'DM Sans, sans-serif', fontWeight: 600, color: '#E2E8F0' }}>{p.full_name}</span>
                  </td>
                  <td style={{ padding: '9px 14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <HelmDot color={roleHelmMap[p.role] ?? 'yellow'} />
                      <span style={{ fontSize: 12, fontFamily: 'DM Sans, sans-serif', color: '#94A3B8' }}>{p.role}</span>
                    </div>
                  </td>
                  <td style={{ padding: '9px 14px' }}>
                    <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 16, fontWeight: 500, color: p.violation_count >= 7 ? '#EF4444' : p.violation_count >= 3 ? '#F59E0B' : '#22C55E' }}>
                      {p.violation_count}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
