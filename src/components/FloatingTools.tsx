import { useEffect, useState } from 'react'
import {
  Bookmark,
  Brain,
  CheckCheck,
  Eraser,
  FileDown,
  FileImage,
  FileStack,
  FileText,
  ImageDown,
  Languages,
  LayoutGrid,
  MessageSquare,
  PenLine,
  Palette,
  ScanText,
  Scissors,
  Settings,
  Sparkles,
  SwatchBook,
  Wand2,
  X,
  type LucideIcon,
} from 'lucide-react'
import type { ToolKind, YtMode } from '../types'

export type FloatingTarget = {
  tab: 'chat' | 'tools' | 'images' | 'prompts' | 'ui' | 'settings'
  tool?: ToolKind
  pdf?: 'word' | 'text' | 'images' | 'merge' | 'split'
  yt?: YtMode
  imageMode?: 'generate' | 'analyze' | 'ocr' | 'convert' | 'palette' | 'removebg'
}

interface Item {
  label: string
  icon: LucideIcon
  target: FloatingTarget
}

interface Group {
  label: string
  items: Item[]
}

const GROUPS: Group[] = [
  {
    label: 'Text',
    items: [
      { label: 'Summarize', icon: FileText, target: { tab: 'tools', tool: 'summarize' } },
      { label: 'Improve', icon: PenLine, target: { tab: 'tools', tool: 'improve' } },
      { label: 'Translate', icon: Languages, target: { tab: 'tools', tool: 'translate' } },
      { label: 'Proofread', icon: CheckCheck, target: { tab: 'tools', tool: 'proofread' } },
    ],
  },
  {
    label: 'Documents · PDF',
    items: [
      { label: 'PDF → Word', icon: FileDown, target: { tab: 'tools', tool: 'pdf', pdf: 'word' } },
      { label: 'PDF → Text', icon: FileText, target: { tab: 'tools', tool: 'pdf', pdf: 'text' } },
      { label: 'PDF → Images', icon: FileImage, target: { tab: 'tools', tool: 'pdf', pdf: 'images' } },
      { label: 'Merge PDFs', icon: FileStack, target: { tab: 'tools', tool: 'pdf', pdf: 'merge' } },
      { label: 'Split PDF', icon: Scissors, target: { tab: 'tools', tool: 'pdf', pdf: 'split' } },
    ],
  },
  {
    label: 'Images',
    items: [
      { label: 'Generate', icon: Wand2, target: { tab: 'images', imageMode: 'generate' } },
      { label: 'Analyze', icon: Brain, target: { tab: 'images', imageMode: 'analyze' } },
      { label: 'OCR', icon: ScanText, target: { tab: 'images', imageMode: 'ocr' } },
      { label: 'Convert', icon: ImageDown, target: { tab: 'images', imageMode: 'convert' } },
      { label: 'Palette', icon: Palette, target: { tab: 'images', imageMode: 'palette' } },
      { label: 'Remove BG', icon: Eraser, target: { tab: 'images', imageMode: 'removebg' } },
    ],
  },
  {
    label: 'Go to',
    items: [
      { label: 'Chat', icon: MessageSquare, target: { tab: 'chat' } },
      { label: 'Prompts', icon: Bookmark, target: { tab: 'prompts' } },
      { label: 'UI pickers', icon: SwatchBook, target: { tab: 'ui' } },
      { label: 'Settings', icon: Settings, target: { tab: 'settings' } },
    ],
  },
]

export default function FloatingTools({
  currentTab,
  onNavigate,
  openSignal,
}: {
  currentTab: FloatingTarget['tab']
  onNavigate: (t: FloatingTarget) => void
  /** When this value changes, the panel opens (e.g. "More tools" buttons). */
  openSignal?: number
}) {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  useEffect(() => {
    if (typeof openSignal === 'number' && openSignal > 0) setOpen(true)
  }, [openSignal])

  const pick = (t: FloatingTarget) => {
    setOpen(false)
    onNavigate(t)
  }

  let i = 0

  return (
    <div className="floating-tools">
      {open && (
        <>
          <div className="ft-backdrop" onClick={() => setOpen(false)} />
          <div className="ft-panel" role="dialog" aria-label="All tools">
            <div className="ft-head">
              <span className="ft-title">
                <Sparkles size={15} />
                All tools
              </span>
              <button
                type="button"
                className="ft-close"
                onClick={() => setOpen(false)}
                aria-label="Close tools"
              >
                <X size={16} />
              </button>
            </div>

            <div className="ft-groups">
              {GROUPS.map((g) => (
                <div key={g.label} className="ft-group">
                  <div className="ft-group-label">{g.label}</div>
                  <div className="ft-items">
                    {g.items.map((it) => {
                      const Icon = it.icon
                      const onCurrentTab = it.target.tab === currentTab
                      return (
                        <button
                          key={it.label}
                          type="button"
                          className={`ft-item ${onCurrentTab ? 'active' : ''}`}
                          style={{ '--i': String(i++) } as React.CSSProperties}
                          onClick={() => pick(it.target)}
                        >
                          <span className="ft-item-icon">
                            <Icon size={15} />
                          </span>
                          <span className="ft-item-label">{it.label}</span>
                        </button>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      <button
        type="button"
        className={`ft-fab ${open ? 'open' : ''}`}
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? 'Close all tools' : 'Open all tools'}
        aria-expanded={open}
      >
        {open ? <X size={20} /> : <LayoutGrid size={20} />}
      </button>
    </div>
  )
}