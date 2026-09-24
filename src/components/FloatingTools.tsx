import { useEffect, useRef, useState } from 'react'
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
  RotateCcw,
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

const FAB_SIZE = 56
const POS_KEY = 'ai-toolbox-fab-pos'

/** Clamp a saved position into the current viewport. */
function clampPos(pos: { x: number; y: number }): { x: number; y: number } {
  const vw = window.innerWidth
  const vh = window.innerHeight
  return {
    x: Math.min(Math.max(0, pos.x), Math.max(FAB_SIZE, vw - FAB_SIZE)),
    y: Math.min(Math.max(0, pos.y), Math.max(FAB_SIZE, vh - FAB_SIZE)),
  }
}

function loadPos(): { x: number; y: number } | null {
  try {
    const raw = localStorage.getItem(POS_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as { x?: number; y?: number }
    if (typeof parsed.x !== 'number' || typeof parsed.y !== 'number') return null
    return clampPos({ x: parsed.x, y: parsed.y })
  } catch {
    return null
  }
}

interface DragState {
  startX: number
  startY: number
  baseX: number
  baseY: number
}

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
  const [fabPos, setFabPos] = useState<{ x: number; y: number } | null>(loadPos)
  const [drag, setDrag] = useState<DragState | null>(null)
  const posRef = useRef(fabPos)
  const skipClick = useRef(false)

  useEffect(() => {
    posRef.current = fabPos
  }, [fabPos])

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

  // Keep a saved position inside the viewport if the window is resized.
  useEffect(() => {
    const onResize = () => {
      setFabPos((p) => (p ? clampPos(p) : p))
    }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  const pick = (t: FloatingTarget) => {
    setOpen(false)
    onNavigate(t)
  }

  const resetPos = () => {
    setFabPos(null)
    try {
      localStorage.removeItem(POS_KEY)
    } catch {
      /* ignore */
    }
  }

  const onFabPointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (e.button !== 0) return
    e.preventDefault()
    e.currentTarget.setPointerCapture(e.pointerId)
    const base =
      fabPos ?? { x: window.innerWidth - 22 - FAB_SIZE, y: window.innerHeight - 22 - FAB_SIZE }
    setDrag({ startX: e.clientX, startY: e.clientY, baseX: base.x, baseY: base.y })
  }

  const onFabPointerMove = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (!drag) return
    const { startX, startY, baseX, baseY } = drag
    const next = clampPos({
      x: baseX + (e.clientX - startX),
      y: baseY + (e.clientY - startY),
    })
    setFabPos(next)
    posRef.current = next
  }

  const onFabPointerUp = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (!drag) return
    const moved = Math.abs(e.clientX - drag.startX) + Math.abs(e.clientY - drag.startY) > 6
    setDrag(null)
    skipClick.current = moved
    if (moved && posRef.current) {
      try {
        localStorage.setItem(POS_KEY, JSON.stringify(posRef.current))
      } catch {
        /* ignore */
      }
    }
  }

  const fabStyle: React.CSSProperties | undefined = fabPos
    ? { left: fabPos.x, top: fabPos.y, right: 'auto', bottom: 'auto' }
    : undefined

  const panelStyle = (): React.CSSProperties | undefined => {
    if (!fabPos) return undefined
    const vw = window.innerWidth
    const vh = window.innerHeight
    const w = Math.min(360, vw - 44)
    const h = Math.min(vh * 0.72, 620)
    const left = Math.max(8, Math.min(fabPos.x, Math.max(8, vw - w - 8)))
    let top = fabPos.y - h - 18
    if (top < 8) top = fabPos.y + FAB_SIZE + 18
    top = Math.min(Math.max(8, top), Math.max(8, vh - 8))
    return { left, top, right: 'auto', bottom: 'auto', width: `${w}px` }
  }

  let i = 0

  return (
    <div className={`floating-tools ${drag ? 'dragging' : ''}`}>
      {open && (
        <>
          <div className="ft-backdrop" onClick={() => setOpen(false)} />
          <div className="ft-panel" role="dialog" aria-label="All tools" style={panelStyle()}>
            <div className="ft-head">
              <span className="ft-title">
                <Sparkles size={15} />
                All tools
              </span>
              <div className="ft-head-actions">
                {fabPos && (
                  <button
                    type="button"
                    className="ft-close ft-reset"
                    onClick={resetPos}
                    aria-label="Reset tools position"
                    title="Reset position"
                  >
                    <RotateCcw size={14} />
                  </button>
                )}
                <button
                  type="button"
                  className="ft-close"
                  onClick={() => setOpen(false)}
                  aria-label="Close tools"
                >
                  <X size={16} />
                </button>
              </div>
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
        style={fabStyle}
        onPointerDown={onFabPointerDown}
        onPointerMove={onFabPointerMove}
        onPointerUp={onFabPointerUp}
        onPointerCancel={() => setDrag(null)}
        onClick={() => {
          if (skipClick.current) {
            skipClick.current = false
            return
          }
          setOpen((v) => !v)
        }}
        aria-label={open ? 'Close all tools' : 'Open all tools'}
        aria-expanded={open}
      >
        {open ? <X size={20} /> : <LayoutGrid size={20} />}
      </button>
    </div>
  )
}