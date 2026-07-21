"use client";

import { useState, useEffect } from 'react';
import { Shield, AlertTriangle, Users, FileWarning } from 'lucide-react';
import { StatCard } from '@/components/shared/StatCard';
import { CameraFeed } from '@/components/shared/CameraFeed';
import { ViolationCard } from '@/components/shared/ViolationCard';
import { analyticsApi, violationApi } from '@/src/lib/api';
import { useWebSocket } from '@/src/lib/useWebSocket';
import { mapViolation } from '@/src/lib/mappers';
import type { Violation } from '@/components/shared/types';
import type { ComplianceSummary } from '@/src/types/simapd';

export default function Dashboard() {
  const [violations, setViolations] = useState<Violation[]>([]);
  const [summary, setSummary] = useState<ComplianceSummary | null>(null);
  const [loading, setLoading] = useState(true);

  const { connected, recentAlerts, lastDetections } = useWebSocket({
    onViolationAlert: () => {
      // Refetch violations when new alert arrives
      violationApi.list({ page_size: '8', page: '1' })
        .then(res => setViolations(res.items.map(mapViolation)))
        .catch(() => {});
    },
  });

  useEffect(() => {
    async function load() {
      try {
        const [dashRes, vioRes] = await Promise.all([
          analyticsApi.dashboard(),
          violationApi.list({ page_size: '8', page: '1' }),
        ]);
        setSummary(dashRes.summary);
        setViolations(vioRes.items.map(mapViolation));
      } catch (err) {
        console.error('Dashboard load failed:', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const complianceRate = summary?.compliance_rate ?? 0;
  const totalToday = summary?.total_violations_today ?? 0;
  const linked = summary?.linked_count ?? 0;
  const unlinked = summary?.unlinked_count ?? 0;
  const totalLinked = `${linked}/${linked + unlinked}`;
  const linkedPct = (linked + unlinked) > 0 ? `${Math.round(linked / (linked + unlinked) * 100)}% linked` : '0% linked';
  const spTotal = summary?.active_sp_count ?? 0;
  const spDetail = `SP1: ${summary?.sp1_count ?? 0} · SP2: ${summary?.sp2_count ?? 0}`;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Stat Cards */}
      <div style={{ display: 'flex', gap: 16 }}>
        <StatCard
          label="Tingkat Kepatuhan"
          value={loading ? '—' : `${complianceRate}%`}
          subtext="Rata-rata hari ini"
          trend={connected ? '● Live' : '○ Offline'}
          trendUp={connected}
          icon={<Shield size={18} />}
          valueColor="#22C55E"
          accentColor="#22C55E"
        />
        <StatCard
          label="Total Pelanggaran"
          value={loading ? '—' : String(totalToday)}
          subtext="Hari ini"
          trend={`${totalToday} hari ini`}
          trendUp={false}
          icon={<AlertTriangle size={18} />}
          valueColor="#EF4444"
          accentColor="#EF4444"
        />
        <StatCard
          label="Terhubung Personel"
          value={loading ? '—' : totalLinked}
          subtext={linkedPct}
          icon={<Users size={18} />}
          valueColor="#3B82F6"
          accentColor="#3B82F6"
        />
        <StatCard
          label="Personel Ber-SP"
          value={loading ? '—' : String(spTotal)}
          subtext={spDetail}
          icon={<FileWarning size={18} />}
          valueColor="#F59E0B"
          accentColor="#F59E0B"
        />
      </div>

      {/* Main content: camera + live feed */}
      <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
        {/* Camera Feed — 60% */}
        <div style={{ flex: 6, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <h2 style={{ fontSize: 13, fontFamily: 'DM Sans, sans-serif', fontWeight: 600, color: '#E2E8F0', margin: 0, textTransform: 'uppercase', letterSpacing: '0.07em' }}>
              Kamera Aktif
            </h2>
            <div style={{ display: 'flex', gap: 8 }}>
              {['CAM-01', 'CAM-02', 'CAM-03', 'CAM-04'].map((cam, i) => (
                <button
                  key={cam}
                  style={{
                    fontFamily: 'JetBrains Mono, monospace',
                    fontSize: 10,
                    padding: '3px 8px',
                    borderRadius: 4,
                    border: `1px solid ${i === 0 ? '#F97316' : '#1E2D3D'}`,
                    background: i === 0 ? 'rgba(249,115,22,0.1)' : 'transparent',
                    color: i === 0 ? '#F97316' : '#64748B',
                    cursor: 'pointer',
                  }}
                >
                  {cam}
                </button>
              ))}
            </div>
          </div>
          <CameraFeed detections={lastDetections} />
        </div>

        {/* Live Violation Feed — 40% */}
        <div style={{ flex: 4, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <h2 style={{ fontSize: 13, fontFamily: 'DM Sans, sans-serif', fontWeight: 600, color: '#E2E8F0', margin: 0, textTransform: 'uppercase', letterSpacing: '0.07em' }}>
              Live Violation Feed
            </h2>
            <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: '#EF4444' }}>
              {violations.length} total
            </span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 480, overflowY: 'auto', paddingRight: 4 }}>
            {loading ? (
              <div style={{ padding: 20, textAlign: 'center', fontSize: 12, color: '#64748B', fontFamily: 'DM Sans, sans-serif' }}>
                Memuat data...
              </div>
            ) : violations.length === 0 ? (
              <div style={{ padding: 20, textAlign: 'center', fontSize: 12, color: '#64748B', fontFamily: 'DM Sans, sans-serif' }}>
                Tidak ada pelanggaran hari ini
              </div>
            ) : (
              violations.map(v => (
                <ViolationCard key={v.id} violation={v} />
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
