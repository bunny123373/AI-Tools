import { Check, ChevronDown, Search, SlidersHorizontal, Sparkles, X } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import type { ModelChoice, ProviderInfo, Settings } from '../types'
import { fetchModels, fetchProviders } from '../api'

interface Props {
  settings: Settings
  onChange: (s: Settings) => void
  /** Show the large hero-style card (welcome screen) with a settings button. */
  big?: boolean
  onOpenSettings?: () => void
}

const FALLBACK_PROVIDERS: ProviderInfo[] = [
  { id: 'ollama', name: 'Ollama (local)', requiresKey: false, keyLabel: '', keyHint: '', free: '100% free & offline' },
  { id: 'openrouter', name: 'OpenRouter (free models)', requiresKey: true, keyLabel: 'OpenRouter API key', keyHint: '', free: 'Free models available' },
  { id: 'gemini', name: 'Google Gemini (free tier)', requiresKey: true, keyLabel: 'Gemini API key', keyHint: '', free: 'Has a free tier' },
  { id: 'xkiro', name: 'xkiro (free models)', requiresKey: true, keyLabel: 'xkiro API key', keyHint: '', free: 'Free models available (:free)' },
  { id: 'puter', name: 'Puter (1000+ models · monthly allowance)', requiresKey: false, keyLabel: '', keyHint: '', free: 'Free monthly allowance (≈$1/month) — resets monthly' },
]

/** Small one-line description synthesized from the model id so each row reads like ChatGPT's list. */
function shortDesc(m: ModelChoice): string {
  const id = m.id.toLowerCase()
  if (id.includes('flash')) return 'Fast & lightweight — great for everyday chat'
  if (id.includes('pro') || id.includes('sonnet') || id.includes('opus')) return 'Advanced reasoning for complex tasks'
  if (id.includes('mini') || id.includes('lite')) return 'Fast and economical'
  if (id.includes('turbo') || id.includes('deepseek')) return 'Strong general-purpose performance'
  if (id.includes('img') || id.includes('image') || m.id.startsWith('gpt-image')) return 'Creates images from text'
  if (id.includes('veo') || id.includes('seedance') || id.includes('kling') || id.includes('wan')) return 'Generates video from text'
  return 'Conversation & tasks'
}

export default function ModelPicker({ settings, onChange, big, onOpenSettings }: Props) {
  const [providers, setProviders] = useState<ProviderInfo[]>(FALLBACK_PROVIDERS)
  const [models, setModels] = useState<ModelChoice[]>([])
  const [note, setNote] = useState('')
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [showAll, setShowAll] = useState(false)
  const searchRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetchProviders().then(setProviders).catch(() => setProviders(FALLBACK_PROVIDERS))
  }, [])

  const refreshModels = async (provider: string) => {
    setLoading(true)
    setNote('')
    try {
      const res = await fetchModels(provider, { xkiroKey: settings.xkiroKey })
      setModels(res.models)
      setNote(res.note || '')
      onChange({
        ...settings,
        provider,
        // "Auto" sticks when switching providers; otherwise keep the current
        // model if it still exists in the list, else fall back to the first.
        model:
          settings.model === 'auto' || res.models.some((m) => m.id === settings.model)
            ? settings.model
            : res.models[0]?.id || '',
      })
    } catch (e) {
      setModels([])
      setNote(e instanceof Error ? e.message : 'Failed to load models.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    refreshModels(settings.provider)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Open by clicking a chip; Escape or overlay click closes.
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    const t = setTimeout(() => searchRef.current?.focus(), 30)
    return () => {
      window.removeEventListener('keydown', onKey)
      clearTimeout(t)
    }
  }, [open])

  const current = providers.find((p) => p.id === settings.provider) || FALLBACK_PROVIDERS[0]
  const hasKey =
    (settings.provider !== 'openrouter' || Boolean(settings.openrouterKey)) &&
    (settings.provider !== 'xkiro' || Boolean(settings.xkiroKey))
  const hasGeminiKey = settings.provider !== 'gemini' || settings.geminiKey

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return models
    return models.filter((m) => m.id.toLowerCase().includes(q) || m.name.toLowerCase().includes(q))
  }, [models, query])

  const visible = showAll ? filtered : filtered.slice(0, 8)

  const pick = (model: string) => {
    onChange({ ...settings, model })
    setOpen(false)
    setQuery('')
    setShowAll(false)
  }

  const openModal = () => {
    setQuery('')
    setShowAll(false)
    setOpen(true)
  }

  const isAuto = settings.model === 'auto' || !settings.model
  const modelLabel = isAuto ? 'Auto' : settings.model

  const trigger = big ? (
    <button
      type="button"
      className="picker-trigger picker-trigger-big"
      onClick={openModal}
      aria-haspopup="dialog"
      aria-expanded={open}
    >
      <span className="picker-trigger-label">
        <span className="picker-trigger-provider">{current.name}</span>
        <span className="picker-trigger-model">{modelLabel}</span>
      </span>
      <ChevronDown size={18} className="picker-chevron" />
    </button>
  ) : (
    <button
      type="button"
      className="picker-trigger"
      onClick={openModal}
      aria-haspopup="dialog"
      aria-expanded={open}
      title={`Model: ${modelLabel} · ${current.name}`}
    >
      <span className="picker-trigger-model">{modelLabel}</span>
      <ChevronDown size={15} className="picker-chevron" />
    </button>
  )

  return (
    <>
      {trigger}
      {big && current && (
        <p className="hint picker-status">
          <span className="status-dot" />
          <span>
            <strong>{current.name}</strong> — {current.free}
          </span>
        </p>
      )}
      {big && current.requiresKey && !hasKey && (
        <p className="hint warn">
            <span>
              {current.keyLabel} is not set. Add it in the <em>Settings</em> tab, or switch to Ollama for fully local use.
            </span>
          </p>
      )}
      {open && (
        <div className="picker-overlay" onClick={() => setOpen(false)}>
          <div
            className="picker-modal"
            role="dialog"
            aria-modal="true"
            aria-label="Select a model"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="picker-modal-header">
              <h3>Select a model</h3>
              <button
                type="button"
                className="icon-btn"
                aria-label="Close"
                onClick={() => setOpen(false)}
              >
                <X size={18} />
              </button>
            </div>

            <div className="picker-modal-search">
              <Search size={16} />
              <input
                ref={searchRef}
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value)
                  setShowAll(false)
                }}
                placeholder="Search models…"
                aria-label="Search models"
              />
            </div>

            <div className="picker-modal-body">
              <div className="picker-providers" role="tablist" aria-label="AI providers">
                {providers.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    role="tab"
                    aria-selected={p.id === settings.provider}
                    className={`picker-provider ${p.id === settings.provider ? 'active' : ''}`}
                    onClick={() => {
                      if (p.id !== settings.provider) {
                        void refreshModels(p.id)
                        setQuery('')
                        setShowAll(false)
                      }
                    }}
                  >
                    <span className="picker-provider-name">{p.name}</span>
                    <span className="picker-provider-free">{p.free}</span>
                  </button>
                ))}
              </div>

              <div className="picker-models" role="tabpanel">
                {!loading && (
                  <button
                    type="button"
                    className={`picker-model picker-auto ${isAuto ? 'active' : ''}`}
                    onClick={() => pick('auto')}
                  >
                    <span className="picker-model-main">
                      <Sparkles size={14} className="picker-auto-icon" />
                      <span className="picker-model-name">Auto (smart default)</span>
                    </span>
                    <span className="picker-model-desc">
                      Picks a good model automatically — vision-capable when you attach an image
                    </span>
                    {isAuto && <Check size={16} className="picker-model-check" />}
                  </button>
                )}
                {loading && <p className="hint picker-loading">Loading models…</p>}
                {!loading && visible.length === 0 && <p className="hint">No models found.</p>}
                {!loading &&
                  visible.map((m) => {
                    const selected = m.id === settings.model
                    return (
                      <button
                        key={m.id}
                        type="button"
                        className={`picker-model ${selected ? 'active' : ''}`}
                        onClick={() => pick(m.id)}
                      >
                        <span className="picker-model-main">
                          <span className="picker-model-name">{m.name}</span>
                          {m.id.startsWith('gpt-image') || /(img|image)/i.test(m.id) ? (
                            <span className="badge">image</span>
                          ) : /(veo|video|seedance)/i.test(m.id) ? (
                            <span className="badge">video</span>
                          ) : null}
                        </span>
                        <span className="picker-model-desc">{shortDesc(m)}</span>
                        {selected && <Check size={16} className="picker-model-check" />}
                      </button>
                    )
                  })}
                {!loading && filtered.length > 8 && (
                  <button
                    type="button"
                    className="picker-more"
                    onClick={() => setShowAll((s) => !s)}
                  >
                    {showAll ? 'Show fewer' : `See all ${filtered.length} models`}
                  </button>
                )}
                {note && <p className="hint picker-note">{note}</p>}
              </div>
            </div>

            <div className="picker-modal-footer">
              {current.requiresKey && !hasKey && (
                <span className="hint warn picker-footer-warn">
                  {current.keyLabel} not set.
                </span>
              )}
              {big && onOpenSettings && (
                <button
                  type="button"
                  className="icon-btn picker-settings"
                  title="Provider settings"
                  aria-label="Provider settings"
                  onClick={() => {
                    setOpen(false)
                    onOpenSettings()
                  }}
                >
                  <SlidersHorizontal size={18} />
                </button>
              )}
              {hasGeminiKey && current.id === 'gemini'}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
