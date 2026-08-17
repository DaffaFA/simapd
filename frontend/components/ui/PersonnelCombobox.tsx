'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import { Loader2, Search, ChevronDown } from 'lucide-react'
import { apiFetch } from '@/src/lib/api'

export interface PersonnelOption {
  id:             string
  employee_id:    string
  full_name:      string
  role:           string
  department?:    string
  cooldown_until?: string | null   // ISO timestamp; null/undefined = tidak cooldown
}

/** Sisa waktu cooldown dalam ms (0 kalau tidak cooldown / sudah lewat). */
function cooldownRemainingMs(person: PersonnelOption, now: number): number {
  if (!person.cooldown_until) return 0
  return Math.max(0, new Date(person.cooldown_until).getTime() - now)
}

function formatCooldown(ms: number): string {
  const totalMinutes = Math.max(1, Math.ceil(ms / 60000))
  const h = Math.floor(totalMinutes / 60)
  const m = totalMinutes % 60
  if (h > 0) return `${h}j ${m}m lagi`
  return `${m}m lagi`
}

interface Props {
  onSelect:    (person: PersonnelOption) => void
  excluded?:   string[]          // IDs yang tidak ditampilkan (sudah dipilih/linked)
  placeholder?: string
  disabled?:   boolean
}

const ROLE_COLOR: Record<string, { bg: string; color: string }> = {
  'Pekerja':        { bg: 'rgba(234,179,8,0.1)', color: '#EAB308' },
  'Supervisor':     { bg: 'rgba(59,130,246,0.1)', color: '#3B82F6' },
  'Safety Officer': { bg: 'rgba(34,197,94,0.1)', color: '#22C55E' },
}

async function fetchPersonnel(query: string): Promise<PersonnelOption[]> {
  const params = query.trim().length >= 2
    ? `?search=${encodeURIComponent(query.trim())}&page_size=15`
    : `?page_size=15`

  const data = await apiFetch<any>(`/personnel${params}`)
  return Array.isArray(data) ? data : (data?.data ?? data?.items ?? [])
}

export function PersonnelCombobox({
  onSelect,
  excluded    = [],
  placeholder = 'Cari nama atau ID karyawan...',
  disabled    = false,
}: Props) {
  const [query,       setQuery]       = useState('')
  const [options,     setOptions]     = useState<PersonnelOption[]>([])
  const [allOptions,  setAllOptions]  = useState<PersonnelOption[]>([])
  const [loading,     setLoading]     = useState(false)
  const [open,        setOpen]        = useState(false)
  const [activeIdx,   setActiveIdx]   = useState(-1)
  const [initLoaded,  setInitLoaded]  = useState(false)
  const [now,         setNow]         = useState(() => Date.now())

  const inputRef     = useRef<HTMLInputElement>(null)
  const dropdownRef  = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const visibleOptions = options.filter(p => !excluded.includes(p.id))

  // ── Tick tiap 30s biar countdown cooldown di dropdown jalan ──────────────
  useEffect(() => {
    if (!open) return
    const timer = setInterval(() => setNow(Date.now()), 30_000)
    return () => clearInterval(timer)
  }, [open])

  // ── Click outside menutup dropdown ────────────────────────────────────────
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
        setActiveIdx(-1)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // ── Load initial data (pertama kali dropdown dibuka) ─────────────────────
  const loadInitial = useCallback(async () => {
    if (initLoaded) {
      setOptions(allOptions)
      setOpen(true)
      return
    }
    setLoading(true)
    try {
      const data = await fetchPersonnel('')
      setAllOptions(data)
      setOptions(data)
      setInitLoaded(true)
      setOpen(true)
    } catch (e) {
      console.error('[PersonnelCombobox] Initial load failed:', e)
    } finally {
      setLoading(false)
    }
  }, [initLoaded, allOptions])

  // ── Search dengan debounce ─────────────────────────────────────────────────
  useEffect(() => {
    if (query.trim().length === 0) {
      setOptions(allOptions)
      return
    }
    if (query.trim().length < 2) return

    const timer = setTimeout(async () => {
      setLoading(true)
      try {
        const data = await fetchPersonnel(query)
        setOptions(data)
        setActiveIdx(-1)
      } catch (e) {
        console.error('[PersonnelCombobox] Search failed:', e)
        const lower = query.toLowerCase()
        setOptions(allOptions.filter(p =>
          p.full_name.toLowerCase().includes(lower) ||
          p.employee_id.toLowerCase().includes(lower)
        ))
      } finally {
        setLoading(false)
      }
    }, 300)

    return () => clearTimeout(timer)
  }, [query, allOptions])

  // ── Handler: input focus ──────────────────────────────────────────────────
  const handleFocus = () => {
    if (!initLoaded) {
      loadInitial()
    } else {
      setOpen(true)
    }
  }

  // ── Handler: input change ─────────────────────────────────────────────────
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value)
    if (!open) setOpen(true)
  }

  // ── Keyboard navigation ────────────────────────────────────────────────────
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open) return

    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIdx(i => Math.min(i + 1, visibleOptions.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIdx(i => Math.max(i - 1, 0))
    } else if (e.key === 'Enter' && activeIdx >= 0 && visibleOptions.length > 0) {
      e.preventDefault()
      const target = visibleOptions[activeIdx]
      if (cooldownRemainingMs(target, now) === 0) selectOption(target)
    } else if (e.key === 'Escape') {
      setOpen(false)
      inputRef.current?.blur()
    }
  }

  const selectOption = useCallback((person: PersonnelOption) => {
    if (cooldownRemainingMs(person, Date.now()) > 0) return
    onSelect(person)
    setQuery('')
    setOptions(allOptions)
    setOpen(false)
    setActiveIdx(-1)
    inputRef.current?.blur()
  }, [onSelect, allOptions])

  const defaultRoleColor = { bg: 'rgba(255,255,255,0.1)', color: '#94A3B8' }

  return (
    <div ref={containerRef} style={{ position: 'relative', width: '100%' }}>
      {/* ── Input ─────────────────────────────────────────────────────────── */}
      <div style={{ position: 'relative' }}>
        <Search style={{
          position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)',
          width: 16, height: 16, color: '#64748B', pointerEvents: 'none',
        }} />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onFocus={handleFocus}
          placeholder={placeholder}
          disabled={disabled}
          autoComplete="off"
          style={{
            width: '100%',
            paddingLeft: 36,
            paddingRight: 32,
            paddingTop: 8,
            paddingBottom: 8,
            fontSize: 13,
            fontFamily: 'DM Sans, sans-serif',
            background: '#0D1117',
            border: `1px solid ${open ? '#3B82F6' : '#1E2D3D'}`,
            borderRadius: 8,
            color: '#E2E8F0',
            outline: 'none',
            transition: 'border-color 0.15s',
            opacity: disabled ? 0.5 : 1,
            cursor: disabled ? 'not-allowed' : 'text',
          }}
        />
        <div style={{
          position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
        }}>
          {loading
            ? <Loader2 style={{ width: 16, height: 16, color: '#64748B', animation: 'spin 1s linear infinite' }} />
            : <ChevronDown style={{
                width: 16, height: 16, color: '#64748B',
                transition: 'transform 0.15s',
                transform: open ? 'rotate(180deg)' : 'none',
              }} />
          }
        </div>
      </div>

      {/* ── Dropdown ──────────────────────────────────────────────────────── */}
      {open && (
        <div
          ref={dropdownRef}
          style={{
            position: 'absolute',
            zIndex: 9999,
            width: '100%',
            marginTop: 4,
            background: '#111827',
            border: '1px solid #1E2D3D',
            borderRadius: 8,
            boxShadow: '0 10px 40px rgba(0,0,0,0.5)',
            maxHeight: 224,
            overflowY: 'auto',
          }}
          // Cegah blur saat klik dropdown
          onMouseDown={e => e.preventDefault()}
        >
          {loading && visibleOptions.length === 0 && (
            <div style={{
              padding: '12px 16px', fontSize: 13, color: '#64748B',
              textAlign: 'center', fontFamily: 'DM Sans, sans-serif',
              display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8
            }}>
              <Loader2 style={{ width: 14, height: 14, animation: 'spin 1s linear infinite' }} />
              Memuat...
            </div>
          )}

          {!loading && visibleOptions.length === 0 && (
            <div style={{
              padding: '12px 16px', fontSize: 13, color: '#64748B',
              textAlign: 'center', fontFamily: 'DM Sans, sans-serif',
            }}>
              {query.trim().length > 0 && query.trim().length < 2
                ? 'Ketik minimal 2 karakter untuk mencari...'
                : query.trim().length >= 2
                  ? `Tidak ada karyawan "${query}"`
                  : 'Tidak ada karyawan tersedia'}
            </div>
          )}

          {!loading && visibleOptions.map((person, idx) => {
            const rColor      = ROLE_COLOR[person.role] ?? defaultRoleColor
            const remainingMs = cooldownRemainingMs(person, now)
            const onCooldown  = remainingMs > 0
            return (
              <button
                key={person.id}
                type="button"
                disabled={onCooldown}
                onClick={() => selectOption(person)}
                onMouseEnter={() => setActiveIdx(idx)}
                title={onCooldown ? `Cooldown — bisa di-link lagi dalam ${formatCooldown(remainingMs)}` : undefined}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  textAlign: 'left',
                  fontSize: 13,
                  fontFamily: 'DM Sans, sans-serif',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  border: 'none',
                  cursor: onCooldown ? 'not-allowed' : 'pointer',
                  transition: 'background 0.1s',
                  background: activeIdx === idx && !onCooldown ? 'rgba(59,130,246,0.1)' : 'transparent',
                  color: onCooldown ? '#64748B' : '#E2E8F0',
                  opacity: onCooldown ? 0.6 : 1,
                }}
              >
                <span style={{
                  flexShrink: 0, fontSize: 10, padding: '2px 6px',
                  borderRadius: 12, fontWeight: 600,
                  background: rColor.bg, color: rColor.color,
                }}>
                  {person.role}
                </span>
                <span style={{ flex: 1, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {person.full_name}
                </span>
                {onCooldown ? (
                  <span style={{
                    flexShrink: 0, fontSize: 10, padding: '2px 6px',
                    borderRadius: 12, fontWeight: 600,
                    background: 'rgba(239,68,68,0.1)', color: '#EF4444',
                    whiteSpace: 'nowrap',
                  }}>
                    Cooldown {formatCooldown(remainingMs)}
                  </span>
                ) : (
                  <span style={{ flexShrink: 0, fontSize: 11, color: '#64748B' }}>
                    {person.employee_id}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
