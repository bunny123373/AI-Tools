import { useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Check, CheckCheck, Copy, FileDown, FileText, Globe, Languages, Mic, PenLine } from 'lucide-react'
import type { Settings, ToolKind, WebMode } from '../types'
import { loadSettings, runTool, saveSettings } from '../api'
import ModelPicker from '../components/ModelPicker'
import PdfTools from '../components/PdfTools'
import TranscribeTools from '../components/TranscribeTools'
import WebTools from '../components/WebTools'
import { AUTO_LANGUAGE, LANGUAGES, POPULAR_LANGUAGES } from '../languages'

const STYLES = ['professional', 'friendly', 'concise', 'casual', 'formal']

type PdfToolMode = 'word' | 'text' | 'images' | 'merge' | 'split'

export default function Tools({
  initialKind,
  initialPdfMode,
  initialWebMode,
}: {
  initialKind?: ToolKind
  initialPdfMode?: PdfToolMode
  initialWebMode?: WebMode
}) {
  const [settings, setSettings] = useState<Settings>(() => loadSettings())
  const [kind, setKind] = useState<ToolKind>(initialKind ?? 'summarize')
  const [text, setText] = useState('')
  const [style, setStyle] = useState('professional')
  const [language, setLanguage] = useState(POPULAR_LANGUAGES[0])
  const [result, setResult] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)

  const update = (s: Settings) => {
    setSettings(s)
    saveSettings(s)
  }

  const run = async () => {
    if (!text.trim() || busy) return
    setBusy(true)
    setError('')
    setResult('')
    try {
      const payload: Record<string, unknown> = {
        provider: settings.provider,
        model: settings.model,
        text,
        openrouterKey: settings.openrouterKey || undefined,
        geminiKey: settings.geminiKey || undefined,
        xkiroKey: settings.xkiroKey || undefined,
        opencodeKey: settings.opencodeKey || undefined,
      }
      if (kind === 'improve') payload.style = style
      if (kind === 'translate') payload.language = language
      const { result: r } = await runTool(kind, payload)
      setResult(r)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="page tools-page">
      <ModelPicker settings={settings} onChange={update} />

      <div className="tool-tabs">
        {(
          [
            ['summarize', 'Summarize'],
            ['improve', 'Improve'],
            ['translate', 'Translate'],
            ['proofread', 'Proofread'],
            ['pdf', 'PDF'],
            ['web', 'Web'],
            ['transcribe', 'Transcribe'],
          ] as [ToolKind, string][]
        ).map(([k, label]) => (
          <button
            key={k}
            className={`tool-tab ${kind === k ? 'active' : ''}`}
            onClick={() => {
              setKind(k)
              setResult('')
              setError('')
            }}
          >
            {k === 'summarize' && <FileText size={16} />}
            {k === 'improve' && <PenLine size={16} />}
            {k === 'translate' && <Languages size={16} />}
            {k === 'proofread' && <CheckCheck size={16} />}
            {k === 'pdf' && <FileDown size={16} />}
            {k === 'web' && <Globe size={16} />}
            {k === 'transcribe' && <Mic size={16} />}
            <span>{label}</span>
          </button>
        ))}
      </div>

      <div className="tool-body">
        {kind === 'pdf' ? (
          <PdfTools initialMode={initialPdfMode} />
        ) : kind === 'web' ? (
          <WebTools settings={settings} initialMode={initialWebMode} />
        ) : kind === 'transcribe' ? (
          <TranscribeTools settings={settings} />
        ) : (
          <>
            <textarea
              className="tool-input"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={
                kind === 'summarize'
                  ? 'Paste the text you want summarized…'
                  : kind === 'improve'
                    ? 'Paste the text you want rewritten…'
                    : kind === 'proofread'
                      ? 'Paste the text you want proofread…'
                      : 'Paste the text you want translated…'
              }
              rows={8}
            />

        {kind === 'improve' && (
          <label className="option-row">
            <span>Style</span>
            <select value={style} onChange={(e) => setStyle(e.target.value)}>
              {STYLES.map((s) => (
                <option key={s} value={s}>
                  {s[0].toUpperCase() + s.slice(1)}
                </option>
              ))}
            </select>
          </label>
        )}
        {kind === 'translate' && (
          <>
            <label className="option-row">
              <span>Target language</span>
              <input
                list="language-list"
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                placeholder="Type any language — e.g. Swahili, Odia, Icelandic…"
              />
            </label>
            <datalist id="language-list">
              <option value={AUTO_LANGUAGE} />
              {LANGUAGES.map((l) => (
                <option key={l.name} value={l.name} label={`${l.name} — ${l.region}`} />
              ))}
            </datalist>
            <div className="lang-chips">
              {[AUTO_LANGUAGE, ...POPULAR_LANGUAGES].map((l) => (
                <button
                  key={l}
                  type="button"
                  className={`lang-chip ${language === l ? 'active' : ''}`}
                  onClick={() => setLanguage(l)}
                >
                  {l}
                </button>
              ))}
            </div>
          </>
        )}

        <button className="primary" onClick={() => void run()} disabled={busy || !text.trim()}>
          {busy ? 'Working…' : `Run ${kind}`}
        </button>

        {error && <p className="hint warn">{error}</p>}

        {kind === 'translate' && (
          <p className="hint">
            <Languages size={13} /> Supports <strong>any language</strong> — pick a suggestion or type your own.
          </p>
        )}

        {result && (
          <div className="result">
            <div className="result-head">
              <span>Result</span>
              <button className="ghost" onClick={() => { void navigator.clipboard.writeText(result); setCopied(true); setTimeout(() => setCopied(false), 1200) }}>
                {copied ? <Check size={14} /> : <Copy size={14} />}
                <span>{copied ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{result}</ReactMarkdown>
          </div>
        )}
          </>
        )}
      </div>
    </div>
  )
}