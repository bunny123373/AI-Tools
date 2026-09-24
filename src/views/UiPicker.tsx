import { useState } from 'react'
import { Aperture, Check, Moon, Palette, Sun, Terminal, Zap, type LucideIcon } from 'lucide-react'
import { THEMES, applyTheme, getTheme } from '../theme'

const THEME_ICONS: Record<string, LucideIcon> = {
  'modern-dark': Moon,
  'light-clean': Sun,
  'cyber-neon': Zap,
  'glass-vibes': Aperture,
  'retro-terminal': Terminal,
}

export default function UiPicker() {
  const [current, setCurrent] = useState(() => getTheme())

  const choose = (id: string) => {
    applyTheme(id)
    setCurrent(id)
  }

  return (
    <div className="page ui-page">
      <div className="section-head">
        <h1>
          <Palette size={22} /> Pick your UI
        </h1>
        <p>
          Five complete designs below — each one is the <strong>same app</strong> wearing a different look.
          Preview them, then hit <em>Apply</em>. Your choice is saved in this browser.
        </p>
      </div>

      <div className="ui-grid">
        {THEMES.map((t) => {
          const Icon = THEME_ICONS[t.id]
          return (
            <div key={t.id} className={`ui-card ${current === t.id ? 'selected' : ''}`}>
              <div className="ui-card-head">
                <h3>
                  {Icon && <Icon size={18} />}
                  <span>{t.name}</span>
                </h3>
                {current === t.id && (
                  <span className="tag">
                    <Check size={12} /> Active
                  </span>
                )}
              </div>
              <p className="hint">{t.description}</p>
              <div className="swatches">
                {t.swatches.map((c) => (
                  <span key={c} style={{ background: c }} />
                ))}
              </div>
              <iframe className="ui-preview" src={`/?theme=${t.id}`} title={`${t.name} preview`} />
              <div className="ui-actions">
                <button className="primary" onClick={() => choose(t.id)} disabled={current === t.id}>
                  <Check size={16} />
                  <span>{current === t.id ? 'Applied' : 'Apply this design'}</span>
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}