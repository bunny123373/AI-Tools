import { ChevronRight, Lightbulb, PenLine, ArrowRight } from 'lucide-react'
import type { FloatingTarget } from './FloatingTools'
import type { Tab } from './TopBar'
import { POPULAR_PROMPTS } from '../registry'
import QuickTools from './QuickTools'

interface Props {
  onNavigate: (t: FloatingTarget) => void
  onSeed: (prompt: string) => void
  onMore: () => void
  onFocusSearch: () => void
  onNav: (t: Tab) => void
}

export default function RightSidebar({ onNavigate, onSeed, onMore, onFocusSearch, onNav }: Props) {
  return (
    <aside className="right-rail">
      <div className="sb-section">
        <div className="sb-label">Quick tools</div>
        <QuickTools onNavigate={onNavigate} onSeed={onSeed} onMore={onMore} onFocusSearch={onFocusSearch} />
      </div>

      <div className="sb-section">
        <div className="sb-head-row">
          <div className="sb-label">Popular prompts</div>
          <button className="sb-view-all" onClick={() => onNav('prompts')}>
            View all
            <ChevronRight size={13} />
          </button>
        </div>
        <div className="pp-list">
          {POPULAR_PROMPTS.map((p) => (
            <button key={p.label} className="pp-item" onClick={() => onSeed(p.prompt)}>
              <span className="pp-text">
                <PenLine size={13} />
                <span>{p.label}</span>
              </span>
              <ArrowRight size={13} />
            </button>
          ))}
        </div>
      </div>

      <div className="tip-card">
        <Lightbulb size={16} />
        <p>
          <strong>Tip</strong> — Use the free models for coding, chatting, and image/video creation. No paid tier needed!
        </p>
      </div>
    </aside>
  )
}