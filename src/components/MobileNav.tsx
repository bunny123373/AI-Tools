import { Bookmark, ImageIcon, MessageSquare, Settings, Wrench, type LucideIcon } from 'lucide-react'
import type { Tab } from './TopBar'

interface Props {
  active: Tab
  onNav: (t: Tab) => void
}

const ITEMS: { id: Tab; label: string; icon: LucideIcon }[] = [
  { id: 'chat', label: 'Chat', icon: MessageSquare },
  { id: 'tools', label: 'Tools', icon: Wrench },
  { id: 'images', label: 'Images', icon: ImageIcon },
  { id: 'prompts', label: 'Prompts', icon: Bookmark },
  { id: 'settings', label: 'Settings', icon: Settings },
]

export default function MobileNav({ active, onNav }: Props) {
  return (
    <nav className="mobile-nav" aria-label="Mobile">
      {ITEMS.map((it) => {
        const Icon = it.icon
        return (
          <button
            key={it.id}
            className={`mn-item ${active === it.id ? 'active' : ''}`}
            onClick={() => onNav(it.id)}
          >
            <Icon size={19} />
            <span>{it.label}</span>
          </button>
        )
      })}
    </nav>
  )
}