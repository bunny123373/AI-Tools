import {
  Clapperboard,
  FileStack,
  FileText,
  Globe,
  Languages,
  LayoutGrid,
  Mic,
  Terminal,
  Wand2,
  type LucideIcon,
} from 'lucide-react'
import type { FloatingTarget } from './FloatingTools'

interface Props {
  className?: string
  onNavigate: (t: FloatingTarget) => void
  onSeed: (prompt: string) => void
  onMore: () => void
  onFocusSearch: () => void
}

interface QuickTool {
  label: string
  icon: LucideIcon
  accent?: string
  action: () => void
}

export default function QuickTools({ className, onNavigate, onSeed, onMore, onFocusSearch }: Props) {
  const tools: QuickTool[] = [
    {
      label: 'Generate Image',
      icon: Wand2,
      action: () => onNavigate({ tab: 'images', imageMode: 'generate' }),
    },
    { label: 'Web Search', icon: Globe, action: onFocusSearch, accent: 'cyan' },
    {
      label: 'Code Helper',
      icon: Terminal,
      action: () =>
        onSeed(
          'You are a senior developer. Help me with my code — explain, fix bugs, or suggest improvements. Here is my code:\n',
        ),
    },
    { label: 'Summarize', icon: FileText, action: () => onNavigate({ tab: 'tools', tool: 'summarize' }) },
    { label: 'Translate', icon: Languages, action: () => onNavigate({ tab: 'tools', tool: 'translate' }) },
    { label: 'PDF Tools', icon: FileStack, action: () => onNavigate({ tab: 'tools', tool: 'pdf' }) },
    {
      label: 'Link Preview',
      icon: Globe,
      accent: 'cyan',
      action: () => onNavigate({ tab: 'tools', tool: 'web', web: 'preview' }),
    },
    {
      label: 'YouTube Ideas',
      icon: Clapperboard,
      accent: 'purple',
      action: () => onSeed('Give me 10 YouTube video ideas with titles, hooks and a short outline. Topic: '),
    },
    {
      label: 'Transcribe Audio',
      icon: Mic,
      accent: 'amber',
      action: () => onNavigate({ tab: 'tools', tool: 'transcribe' }),
    },
    { label: 'More Tools', icon: LayoutGrid, accent: 'blue', action: onMore },
  ]

  return (
    <div className={`qt-grid ${className || ''}`}>
      {tools.map((t) => {
        const Icon = t.icon
        return (
          <button key={t.label} className={`qt-card ${t.accent ? `qt-${t.accent}` : ''}`} onClick={t.action}>
            <span className="qt-icon">
              <Icon size={16} />
            </span>
            <span className="qt-label">{t.label}</span>
          </button>
        )
      })}
    </div>
  )
}