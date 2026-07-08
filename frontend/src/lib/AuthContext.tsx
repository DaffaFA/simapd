'use client'
import { createContext, useContext, useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { User } from '../types/simapd'
import { authApi } from './api'

interface AuthCtx { user: User|null; isLoading: boolean; login(u:string,p:string):Promise<void>; logout():void }
const Ctx = createContext<AuthCtx>(null!)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser]         = useState<User|null>(null)
  const [isLoading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const token = localStorage.getItem('simapd_token')
    if (token) {
      authApi.me().then(setUser).catch(()=>localStorage.removeItem('simapd_token')).finally(()=>setLoading(false))
    } else {
      setLoading(false)
    }
  }, [])

  const login = async (username: string, password: string) => {
    const res = await authApi.login({ username, password })
    localStorage.setItem('simapd_token', res.access_token)
    setUser(res.user); router.push('/')
  }

  const logout = () => {
    localStorage.removeItem('simapd_token'); setUser(null); router.push('/login')
  }

  return <Ctx.Provider value={{ user, isLoading, login, logout }}>{children}</Ctx.Provider>
}

export const useAuth = () => useContext(Ctx)
