'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import { Header } from '@/components/layout/Header';
import { useAuth } from '@/src/lib/AuthContext';
import { EDITOR_ROLES, hasRole } from '@/src/lib/roles';

const pageTitles: Record<string, { title: string; subtitle: string }> = {
  '/': { title: 'Dashboard Pemantauan Real-Time', subtitle: 'Pemantauan APD langsung dari kamera CCTV aktif' },
  '/violations': { title: 'Manajemen Pelanggaran', subtitle: 'Rekap & tindak lanjut seluruh insiden pelanggaran APD' },
  '/personnel': { title: 'Manajemen Personel & SP', subtitle: 'Data karyawan, riwayat pelanggaran, dan surat peringatan' },
  '/analytics': { title: 'Pelaporan & Analitik', subtitle: 'Tren kepatuhan, distribusi, dan laporan periodik' },
  '/settings': { title: 'Pengaturan Sistem', subtitle: 'Konfigurasi SP, manajemen kamera, dan preferensi sistem' },
  '/settings/sp-config': { title: 'Pengaturan Sistem', subtitle: 'Konfigurasi SP, manajemen kamera, dan preferensi sistem' },
  '/settings/cameras': { title: 'Pengaturan Sistem', subtitle: 'Konfigurasi SP, manajemen kamera, dan preferensi sistem' },
};

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isLoading } = useAuth();
  const meta = pageTitles[pathname] ?? { title: 'SiMAPD', subtitle: '' };

  useEffect(() => {
    if (isLoading) return;
    if (!user) {
      router.replace('/login');
      return;
    }
    // Pengaturan mengubah konfigurasi SP & kamera - dibatasi ke role yang sama seperti @Roles() di backend
    if (pathname.startsWith('/settings') && !hasRole(user.role, EDITOR_ROLES)) {
      router.replace('/');
    }
  }, [isLoading, user, pathname, router]);

  if (isLoading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: '#080C10' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 32, height: 32, border: '3px solid #1E2D3D', borderTopColor: '#F97316', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
          <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 13, color: '#64748B' }}>Memuat...</span>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      </div>
    );
  }

  if (!user) return null;
  if (pathname.startsWith('/settings') && !hasRole(user.role, EDITOR_ROLES)) return null;

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#080C10' }}>
      <Sidebar />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <Header title={meta.title} subtitle={meta.subtitle} />
        <main style={{ flex: 1, padding: 24, overflowY: 'auto' }}>
          {children}
        </main>
      </div>
    </div>
  );
}

