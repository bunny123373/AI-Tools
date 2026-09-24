import { useEffect, useState } from 'react'
import { Bookmark, Home, ImageIcon, LogOut, MessageSquare, Palette, Plus, Settings, Sparkles, Trash2, Wrench, type LucideIcon } from 'lucide-react'
import { signOut, useSession } from 'next-auth/react'
import type { Tab } from './TopBar'
import type { HistorySummary } from '../types'
import { deleteChat, listChats, loadSettings } from '../api'
import { RECENT_CHATS } from '../registry'

interface Props {
  active: Tab
  onNav: (t: Tab) => void
  onNewChat: () => void
  onSeed: (prompt: string) => void
  /** Conversation open in the chat view (highlighted in the list). */
  activeChatId?: string | null
  onOpenChat?: (id: string) => void
  onDeleteChat?: (id: string) => void
  /** Bumped whenever history changes, so the list refetches. */
  historyKey?: number
}

const NAV: { label: string; tab: Tab; icon: LucideIcon }[] = [
  { label: 'Home', tab: 'chat', icon: Home },
  { label: 'Chat', tab: 'chat', icon: MessageSquare },
  { label: 'Tools', tab: 'tools', icon: Wrench },
  { label: 'Images', tab: 'images', icon: ImageIcon },
  { label: 'Prompts', tab: 'prompts', icon: Bookmark },
  { label: 'UI Components', tab: 'ui', icon: Palette },
  { label: 'Settings', tab: 'settings', icon: Settings },
]

const PROVIDER_LABEL: Record<string, string> = {
  ollama: 'Ollama (local)',
  openrouter: 'OpenRouter',
  gemini: 'Gemini',
}

export default function LeftSidebar({ active, onNav, onNewChat, onSeed, activeChatId, onOpenChat, onDeleteChat, historyKey = 0 }: Props) {
  const settings = loadSettings()
  const providerLabel = PROVIDER_LABEL[settings.provider] || settings.provider || 'Local'

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

  const [chats, setChats] = useState<HistorySummary[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let alive = true
    setLoading(true)
    listChats()
      .then((res) => {
        if (alive) setChats(res.chats)
      })
      .catch(() => {
        if (alive) setChats([])
      })
      .finally(() => {
        if (alive) setLoading(false)
      })
    return () => {
      alive = false
    }
  }, [historyKey])

  const removeChat = async (id: string) => {
    try {
      await deleteChat(id)
    } catch {
      // Keep the item in the sidebar if the delete request failed.
      return
    }
    setChats((prev) => prev.filter((c) => c.id !== id))
    onDeleteChat?.(id)
  }

  return (
    <aside className="left-sidebar">
      <button className="new-chat" onClick={onNewChat}>
        <Plus size={17} />
        <span>New Chat</span>
      </button>

      <div className="sb-section">
        <div className="sb-label">Navigate</div>
        <nav className="sb-nav">
          {NAV.map((n) => {
            const Icon = n.icon
            const isActive = active === n.tab
            return (
              <button
                key={n.label}
                className={`sb-link ${isActive ? 'active' : ''}`}
                onClick={() => onNav(n.tab)}
              >
                <Icon size={16} />
                <span>{n.label}</span>
              </button>
            )
          })}
        </nav>
      </div>

      <div className="sb-section recent">
        <div className="sb-label">Chat history</div>
        <div className="sb-recent">
          {chats.length > 0 ? (
            chats.map((c) => (
              <div key={c.id} className={`recent-row ${c.id === activeChatId ? 'active' : ''}`}>
                <button
                  className="sb-link recent-item"
                  title={c.title}
                  onClick={() => onOpenChat?.(c.id)}
                >
                  <MessageSquare size={14} />
                  <span className="recent-title">{c.title}</span>
                </button>
                <button
                  className="recent-del"
                  title="Delete chat"
                  aria-label={`Delete chat: ${c.title}`}
                  onClick={() => void removeChat(c.id)}
                >
                  <Trash2 size={13} />
                </button>
              </div>
            ))
          ) : (
            <>
              {!loading && (
                <p className="sb-hint">
                  No saved chats yet — conversations appear here as you chat.
                </p>
              )}
              {RECENT_CHATS.map((r) => (
                <button key={r.label} className="sb-link recent-item" onClick={() => onSeed(r.prompt)}>
                  <MessageSquare size={14} />
                  <span>{r.label}</span>
                </button>
              ))}
            </>
          )}
        </div>
      </div>

      <div className="sb-foot">
        <div className="profile-card">
          <div className="avatar avatar-lg">{initials}</div>
          <div className="profile-meta">
            <strong>{session?.user?.name?.trim() || 'Guest'}</strong>
            <span>{session?.user?.email || 'Not signed in'}</span>
          </div>
          <button
            className="profile-signout"
            onClick={() => signOut({ callbackUrl: '/login' })}
            title="Sign out"
            aria-label="Sign out"
          >
            <LogOut size={14} />
          </button>
        </div>

        <button className="provider-card" onClick={() => onNav('settings')} title="Open settings">
          <span className="status-dot" />
          <div className="provider-meta">
            <strong>{providerLabel}</strong>
            <span>{settings.model || 'No model selected'}</span>
          </div>
          <Settings size={14} />
        </button>

        <div className="sb-offline">
          <Sparkles size={13} />
          <span>Runs fully local with Ollama — no internet needed.</span>
        </div>
      </div>
    </aside>
  )
}