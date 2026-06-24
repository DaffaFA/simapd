'use client';

import { usePathname } from 'next/navigation';
import { Sidebar } from '@/components/layout/Sidebar';
import { Header } from '@/components/layout/Header';

const pageTitles: Record<string, { title: string; subtitle: string }> = {
  '/': { title: 'Dashboard Pemantauan Real-Time', subtitle: 'Pemantauan APD langsung dari kamera CCTV aktif' },
  '/violations': { title: 'Manajemen Pelanggaran', subtitle: 'Rekap & tindak lanjut seluruh insiden pelanggaran APD' },
  '/personnel': { title: 'Manajemen Personel & SP', subtitle: 'Data karyawan, riwayat pelanggaran, dan surat peringatan' },
  '/analytics': { title: 'Pelaporan & Analitik', subtitle: 'Tren kepatuhan, distribusi, dan laporan periodik' },
};

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const meta = pageTitles[pathname] ?? { title: 'SiMAPD', subtitle: '' };

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
