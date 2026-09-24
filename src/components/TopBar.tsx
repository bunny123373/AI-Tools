import { useState } from 'react'
import {
  Bookmark,
  Boxes,
  ImageIcon,
  LogOut,
  MessageSquare,
  Moon,
  Palette,
  Settings,
  Sun,
  Wrench,
  Zap,
  type LucideIcon,
} from 'lucide-react'
import { signOut, useSession } from 'next-auth/react'
import type { FloatingTarget } from './FloatingTools'
import ToolSearch from './ToolSearch'
import { applyTheme, getTheme } from '../theme'

export type Tab = 'chat' | 'tools' | 'images' | 'prompts' | 'ui' | 'settings'

export const TABS: { id: Tab; label: string }[] = [
  { id: 'chat', label: 'Chat' },
  { id: 'tools', label: 'Tools' },
  { id: 'images', label: 'Images' },
  { id: 'prompts', label: 'Prompts' },
  { id: 'ui', label: 'UI' },
  { id: 'settings', label: 'Settings' },
]

export const TAB_ICONS: Record<Tab, LucideIcon> = {
  chat: MessageSquare,
  tools: Wrench,
  images: ImageIcon,
  prompts: Bookmark,
  ui: Palette,
  settings: Settings,
}

interface Props {
  active: Tab
  onNav: (t: Tab) => void
  onPick: (t: FloatingTarget) => void
}

export default function TopBar({ active, onNav, onPick }: Props) {
  const [, force] = useState(0)
  const isLight = getTheme() === 'light-clean'
  const [menuOpen, setMenuOpen] = useState(false)

  const { data: session } = useSession()
  const displayName = session?.user?.name?.trim() || session?.user?.email || undefined
  const initials = displayName
    ? displayName
        .split(/[\s@._-]+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((p) => p[0]?.toUpperCase())
        .join('') || 'AI'
    : 'AI'

  const toggleTheme = () => {
    applyTheme(isLight ? 'modern-dark' : 'light-clean')
    force((v) => v + 1)
  }

  return (
    <header className="topbar">
      <div className="brand">
        <span className="brand-logo">
          <Boxes size={20} />
        </span>
        <span className="brand-name">AI Toolbox</span>
      </div>

      <nav className="tabs" aria-label="Primary">
        {TABS.map((t) => {
          const Icon = TAB_ICONS[t.id]
          return (
            <button
              key={t.id}
              className={`tab ${active === t.id ? 'active' : ''}`}
              onClick={() => onNav(t.id)}
            >
              <Icon size={15} />
              <span>{t.label}</span>
            </button>
          )
        })}
      </nav>

      <ToolSearch onPick={onPick} />

      <button
        className="icon-btn"
        onClick={toggleTheme}
        title={isLight ? 'Switch to dark theme' : 'Switch to light theme'}
        aria-label="Toggle theme"
      >
        {isLight ? <Sun size={17} /> : <Moon size={17} />}
      </button>

      <span className="free-badge">
        <Zap size={12} />
        <span>100% free</span>
      </span>

      <div className="user-menu">
        <button
          className={`avatar avatar-btn ${menuOpen ? 'open' : ''}`}
          onClick={() => setMenuOpen((v) => !v)}
          title={displayName ? `${displayName} — AI Toolbox account` : 'AI Toolbox account'}
          aria-label="Account menu"
          aria-expanded={menuOpen}
        >
          {initials}
        </button>
        {menuOpen && (
          <>
            <div className="user-menu-backdrop" onClick={() => setMenuOpen(false)} />
            <div className="user-menu-card">
              <div className="user-menu-head">
                <div className="avatar">{initials}</div>
                <div className="user-menu-meta">
                  <strong>{session?.user?.name?.trim() || 'Signed in'}</strong>
                  <span>{session?.user?.email || 'AI Toolbox account'}</span>
                </div>
              </div>
              <button
                className="user-menu-signout"
                onClick={() => signOut({ callbackUrl: '/login' })}
              >
                <LogOut size={14} />
                Sign out
              </button>
            </div>
          </>
        )}
      </div>
    </header>
  )
}