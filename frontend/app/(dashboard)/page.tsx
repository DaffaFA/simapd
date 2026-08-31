"use client";

import { useState, useEffect } from 'react';
import { Shield, AlertTriangle, Users, FileWarning } from 'lucide-react';
import { StatCard } from '@/components/shared/StatCard';
import { ViolationCard } from '@/components/shared/ViolationCard';
import { analyticsApi, violationApi } from '@/src/lib/api';
import { useWebSocket } from '@/src/lib/useWebSocket';
import { mapViolation } from '@/src/lib/mappers';
import type { Violation } from '@/components/shared/types';
import type { ComplianceSummary } from '@/src/types/simapd';
import { CameraStreamCanvas } from '@/components/stream/CameraStreamCanvas';

export default function Dashboard() {
  const [violations, setViolations] = useState<Violation[]>([]);
  const [summary, setSummary] = useState<ComplianceSummary | null>(null);
  const [loading, setLoading] = useState(true);

  const { isConnected, connected, recentAlerts, lastDetections, latestFrames } = useWebSocket();
  const [focusedCam, setFocusedCam] = useState<string | null>(null);
  const activeCams = Array.from(latestFrames.keys());

  useEffect(() => {
    if (recentAlerts.length > 0) {
      violationApi.list({ page_size: '8', page: '1' })
        .then(res => setViolations(res.items.map(mapViolation)))
        .catch(() => {});
    }
  }, [recentAlerts]);

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
    <div className="p-6 space-y-6">
      {/* Stat Cards */}
      <div style={{ display: 'flex', gap: 16 }}>
        <StatCard
          label="Tingkat Kepatuhan"
          value={loading ? '-' : `${complianceRate}%`}
          subtext="Rata-rata hari ini"
          trend={connected ? '● Live' : '○ Offline'}
          trendUp={connected}
          icon={<Shield size={18} />}
          valueColor="#22C55E"
          accentColor="#22C55E"
          formula="(1 − jumlah pelanggaran ÷ total deteksi) × 100%, dihitung dari data deteksi real-time hari ini."
        />
        <StatCard
          label="Total Pelanggaran"
          value={loading ? '-' : String(totalToday)}
          subtext="Hari ini"
          trend={`${totalToday} hari ini`}
          trendUp={false}
          icon={<AlertTriangle size={18} />}
          valueColor="#EF4444"
          accentColor="#EF4444"
          formula="Jumlah baris pelanggaran dengan waktu deteksi antara 00:00–23:59 hari ini."
        />
        <StatCard
          label="Terhubung Personel"
          value={loading ? '-' : totalLinked}
          subtext={linkedPct}
          icon={<Users size={18} />}
          valueColor="#3B82F6"
          accentColor="#3B82F6"
          formula="Pelanggaran hari ini yang sudah dikaitkan ke personel ÷ total pelanggaran hari ini."
        />
        <StatCard
          label="Personel Ber-SP"
          value={loading ? '-' : String(spTotal)}
          subtext={spDetail}
          icon={<FileWarning size={18} />}
          valueColor="#F59E0B"
          accentColor="#F59E0B"
          formula="Jumlah Surat Peringatan berstatus aktif (belum melewati tanggal berlaku)."
        />
      </div>

      {/* ── Live Demo Stream ────────────────────────────────────────────── */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">Live Monitor</h2>
          <div className="flex items-center gap-2 text-sm">
            <span className={`w-2 h-2 rounded-full ${
              isConnected && activeCams.length > 0
                ? 'bg-green-500 animate-pulse'
                : 'bg-gray-300'
            }`} />
            <span className="text-gray-500">
              {activeCams.length > 0
                ? `${activeCams.length} kamera aktif`
                : 'Menunggu stream...'}
            </span>
          </div>
        </div>

        <div className="bg-gray-950 rounded-xl overflow-hidden">
          {activeCams.length === 0 ? (
            // Placeholder saat demo belum jalan
            <div className="aspect-video flex flex-col items-center justify-center text-gray-600 gap-3">
              <span className="text-4xl">📹</span>
              <p className="text-sm">Jalankan AI service dalam DEMO_MODE=true</p>
              <code className="text-xs bg-gray-900 px-3 py-1.5 rounded text-gray-400">
                DEMO_MODE=true VIDEO_DIR=./videos python main.py
              </code>
            </div>
          ) : focusedCam ? (
            // Mode fokus: satu kamera fullscreen
            <div>
              <div className="flex items-center gap-2 px-4 py-2 bg-gray-900">
                <button
                  onClick={() => setFocusedCam(null)}
                  className="text-xs text-gray-400 hover:text-white transition-colors"
                >
                  ← Semua
                </button>
                <span className="text-xs text-gray-500">|</span>
                <span className="text-xs font-mono text-gray-300">{focusedCam}</span>
              </div>
              <CameraStreamCanvas
                cameraId={focusedCam}
                latestFrame={latestFrames.get(focusedCam)}
                className="w-full"
              />
            </div>
          ) : (
            // Grid mode: semua kamera aktif
            <div className={`grid gap-0.5 p-0.5 ${
              activeCams.length === 1 ? 'grid-cols-1'
              : activeCams.length === 2 ? 'grid-cols-2'
              : 'grid-cols-2'
            }`}>
              {activeCams.map(camId => (
                <div
                  key={camId}
                  className="cursor-pointer group"
                  onClick={() => setFocusedCam(camId)}
                >
                  <CameraStreamCanvas
                    cameraId={camId}
                    latestFrame={latestFrames.get(camId)}
                    className="w-full group-hover:brightness-110 transition-all"
                    showLabels
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        {activeCams.length > 1 && !focusedCam && (
          <p className="text-xs text-gray-400 mt-2 text-center">
            Klik kamera untuk fokus · {activeCams.length} video sedang diproses
          </p>
        )}
      </div>

      {/* ── Recent alerts (ringkas) ─────────────────────────────────────── */}
      {recentAlerts.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold mb-3">Alert Terbaru</h2>
          <div className="space-y-2">
            {recentAlerts.slice(0, 3).map((alert, i) => (
              <div key={i}
                className="flex items-center gap-3 p-3 bg-red-50 border border-red-100 rounded-lg text-sm">
                <span className="text-red-400 text-lg shrink-0">⚠</span>
                <div className="min-w-0">
                  <p className="font-medium text-red-800 truncate">
                    {alert.camera_id} - {(alert.missing_ppe ?? [])
                      .map((p: string) =>
                        p === 'helm' ? 'Helm' : p === 'vest' ? 'Rompi' : 'Sepatu'
                      ).join(', ')} tidak terpasang
                  </p>
                  <p className="text-xs text-red-400">
                    {new Date(alert.timestamp).toLocaleTimeString('id-ID')}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
