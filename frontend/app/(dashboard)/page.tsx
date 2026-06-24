"use client";

import { Shield, AlertTriangle, Users, FileWarning } from 'lucide-react';
import { StatCard } from '@/components/shared/StatCard';
import { CameraFeed } from '@/components/shared/CameraFeed';
import { ViolationCard } from '@/components/shared/ViolationCard';
import { mockViolations } from '@/components/shared/mockData';

export default function Dashboard() {
  const liveViolations = mockViolations.slice(0, 8);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Stat Cards */}
      <div style={{ display: 'flex', gap: 16 }}>
        <StatCard
          label="Tingkat Kepatuhan"
          value="78.4%"
          subtext="Rata-rata hari ini"
          trend="+3.2%"
          trendUp
          icon={<Shield size={18} />}
          valueColor="#22C55E"
          accentColor="#22C55E"
        />
        <StatCard
          label="Total Pelanggaran"
          value="17"
          subtext="Hari ini"
          trend="+5 hari ini"
          trendUp={false}
          icon={<AlertTriangle size={18} />}
          valueColor="#EF4444"
          accentColor="#EF4444"
        />
        <StatCard
          label="Terhubung Personel"
          value="12/17"
          subtext="70.6% linked"
          icon={<Users size={18} />}
          valueColor="#3B82F6"
          accentColor="#3B82F6"
        />
        <StatCard
          label="Personel Ber-SP"
          value="3"
          subtext="SP1: 2 · SP2: 1"
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
          <CameraFeed />
        </div>

        {/* Live Violation Feed — 40% */}
        <div style={{ flex: 4, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <h2 style={{ fontSize: 13, fontFamily: 'DM Sans, sans-serif', fontWeight: 600, color: '#E2E8F0', margin: 0, textTransform: 'uppercase', letterSpacing: '0.07em' }}>
              Live Violation Feed
            </h2>
            <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: '#EF4444' }}>
              {liveViolations.length} total
            </span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 480, overflowY: 'auto', paddingRight: 4 }}>
            {liveViolations.map(v => (
              <ViolationCard key={v.id} violation={v} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
