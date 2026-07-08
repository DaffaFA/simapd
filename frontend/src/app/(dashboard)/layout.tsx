// Semua halaman protected dalam group (dashboard)
'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '../../lib/AuthContext'
// Menggunakan placeholder untuk Sidebar yang belum diimplementasikan
const Sidebar = () => <aside className="w-64 bg-gray-100 p-4 min-h-screen">Sidebar Placeholder</aside>

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth()
  const router = useRouter()
  
  useEffect(() => { 
    if (!isLoading && !user) router.push('/login') 
  }, [user, isLoading, router])
  
  if (isLoading) return <div className="flex h-screen items-center justify-center">Memuat...</div>
  if (!user) return null
  
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 p-6">{children}</main>
    </div>
  )
}
