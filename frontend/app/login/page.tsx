"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Shield, Eye, EyeOff, CheckCircle2 } from 'lucide-react';

export default function Login() {
  const router = useRouter();
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      router.push('/');
    }, 1000);
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        background: '#080C10',
        fontFamily: 'DM Sans, sans-serif',
      }}
    >
      {/* Left branding panel */}
      <div
        style={{
          flex: 1,
          background: 'linear-gradient(135deg, #080C10 0%, #0D1520 100%)',
          borderRight: '1px solid #1E2D3D',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          padding: '60px 56px',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Background grid */}
        <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0.06 }}>
          {Array.from({ length: 12 }, (_, i) => (
            <line key={`v${i}`} x1={`${i * 100 / 11}%`} y1="0" x2={`${i * 100 / 11}%`} y2="100%" stroke="#3B82F6" strokeWidth="1" />
          ))}
          {Array.from({ length: 8 }, (_, i) => (
            <line key={`h${i}`} x1="0" y1={`${i * 100 / 7}%`} x2="100%" y2={`${i * 100 / 7}%`} stroke="#3B82F6" strokeWidth="1" />
          ))}
        </svg>

        {/* Decorative bounding boxes */}
        <svg style={{ position: 'absolute', right: 40, top: '15%', opacity: 0.12 }} width="180" height="240">
          <rect x="10" y="10" width="60" height="100" rx="2" stroke="#EF4444" strokeWidth="1.5" fill="none" />
          <rect x="80" y="30" width="55" height="90" rx="2" stroke="#22C55E" strokeWidth="1.5" fill="none" />
          <rect x="30" y="120" width="50" height="85" rx="2" stroke="#F97316" strokeWidth="1.5" fill="none" />
          <text x="10" y="8" fontSize="8" fill="#EF4444" fontFamily="JetBrains Mono, monospace">TRK-012</text>
          <text x="80" y="28" fontSize="8" fill="#22C55E" fontFamily="JetBrains Mono, monospace">TRK-007</text>
        </svg>

        <div style={{ position: 'relative' }}>
          {/* Logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 48 }}>
            <div style={{ width: 48, height: 48, background: '#F97316', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Shield size={28} color="#fff" strokeWidth={2} />
            </div>
            <div>
              <div style={{ fontSize: 26, fontWeight: 800, color: '#E2E8F0', letterSpacing: '-0.02em' }}>SiMAPD</div>
              <div style={{ fontSize: 11, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 600 }}>Safety Monitor System</div>
            </div>
          </div>

          <h2 style={{ fontSize: 28, fontWeight: 700, color: '#E2E8F0', lineHeight: 1.3, marginBottom: 12, letterSpacing: '-0.02em' }}>
            Pantau kepatuhan APD<br />
            <span style={{ color: '#F97316' }}>secara real-time.</span>
          </h2>
          <p style={{ fontSize: 14, color: '#64748B', lineHeight: 1.6, marginBottom: 40, maxWidth: 380 }}>
            Sistem monitoring Alat Pelindung Diri berbasis AI untuk lingkungan pelabuhan — deteksi otomatis, pelacakan presisi, peringatan instan.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {[
              { icon: '🎯', title: 'Real-Time Detection', desc: 'YOLOv8m dengan mAP 0.87 untuk akurasi tinggi' },
              { icon: '📍', title: 'ByteTrack Tracking', desc: 'Pelacakan multi-objek persisten lintas frame' },
              { icon: '📋', title: 'Automated SP', desc: 'Sistem surat peringatan berjenjang otomatis' },
            ].map(({ icon, title, desc }) => (
              <div key={title} style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                <div style={{ width: 32, height: 32, background: 'rgba(249,115,22,0.1)', border: '1px solid rgba(249,115,22,0.2)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0 }}>
                  {icon}
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#E2E8F0', marginBottom: 2 }}>{title}</div>
                  <div style={{ fontSize: 11, color: '#64748B' }}>{desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right form panel */}
      <div
        style={{
          width: 440,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          padding: '60px 48px',
        }}
      >
        <div
          style={{
            background: '#111827',
            border: '1px solid #1E2D3D',
            borderRadius: 12,
            padding: '32px 28px',
            display: 'flex',
            flexDirection: 'column',
            gap: 0,
          }}
        >
          <h3 style={{ fontSize: 20, fontWeight: 700, color: '#E2E8F0', margin: '0 0 4px' }}>Masuk ke SiMAPD</h3>
          <p style={{ fontSize: 12, color: '#64748B', margin: '0 0 28px' }}>Masukkan kredensial Anda untuk melanjutkan</p>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ fontSize: 11, fontWeight: 600, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Username / Email</label>
              <input
                type="text"
                defaultValue="safety.officer@pelabuhan.id"
                style={{ background: '#0D1117', border: '1px solid #1E2D3D', borderRadius: 7, padding: '10px 14px', fontSize: 13, fontFamily: 'DM Sans, sans-serif', color: '#E2E8F0', outline: 'none', transition: 'border-color 0.15s' }}
                onFocus={e => { e.target.style.borderColor = '#F97316'; }}
                onBlur={e => { e.target.style.borderColor = '#1E2D3D'; }}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ fontSize: 11, fontWeight: 600, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Password</label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPass ? 'text' : 'password'}
                  defaultValue="••••••••"
                  style={{ width: '100%', background: '#0D1117', border: '1px solid #1E2D3D', borderRadius: 7, padding: '10px 40px 10px 14px', fontSize: 13, fontFamily: 'DM Sans, sans-serif', color: '#E2E8F0', outline: 'none', boxSizing: 'border-box', transition: 'border-color 0.15s' }}
                  onFocus={e => { e.target.style.borderColor = '#F97316'; }}
                  onBlur={e => { e.target.style.borderColor = '#1E2D3D'; }}
                />
                <button
                  type="button"
                  onClick={() => setShowPass(v => !v)}
                  style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#64748B', display: 'flex' }}
                >
                  {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{
                marginTop: 4,
                padding: '12px',
                borderRadius: 8,
                border: 'none',
                background: loading ? 'rgba(249,115,22,0.5)' : '#F97316',
                color: '#fff',
                fontSize: 14,
                fontFamily: 'DM Sans, sans-serif',
                fontWeight: 700,
                cursor: loading ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                transition: 'background 0.15s',
              }}
            >
              {loading ? (
                <>
                  <span style={{ width: 16, height: 16, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.7s linear infinite', display: 'inline-block' }} />
                  Memverifikasi...
                </>
              ) : (
                <>
                  <CheckCircle2 size={16} />
                  Masuk ke Dashboard
                </>
              )}
            </button>
          </form>

          <div style={{ marginTop: 20, padding: '10px 12px', background: 'rgba(100,116,139,0.08)', border: '1px solid rgba(100,116,139,0.15)', borderRadius: 6 }}>
            <p style={{ fontSize: 11, color: '#64748B', margin: 0, textAlign: 'center' }}>
              🔒 Sistem ini terbatas untuk <strong style={{ color: '#94A3B8' }}>Safety Officer</strong> & <strong style={{ color: '#94A3B8' }}>Supervisor</strong> yang berwenang
            </p>
          </div>
        </div>

        <div style={{ marginTop: 20, textAlign: 'center' }}>
          <p style={{ fontSize: 11, color: '#64748B', margin: 0 }}>
            SiMAPD v1.0.0 · Tugas Akhir — Teknik Informatika
          </p>
        </div>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
