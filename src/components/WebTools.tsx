import { useCallback, useEffect, useRef, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Check, Copy, ExternalLink, FileText, Globe, Link2, Loader2 } from 'lucide-react'
import type { Settings, WebMode, WebUnfurl } from '../types'
import { articleSummary, unfurl } from '../api'

const URL_RE = /^https?:\/\/\S+$/i

type SummaryDetail = 'brief' | 'standard' | 'detailed'

const DETAILS: { id: SummaryDetail; label: string }[] = [
  { id: 'brief', label: 'Brief' },
  { id: 'standard', label: 'Standard' },
  { id: 'detailed', label: 'Detailed' },
]

interface Props {
  settings: Settings
  initialMode?: WebMode
}

/**
 * Web tools: Link preview (fetch any URL → title/description/image card,
 * auto-fetched on paste) and Article summary (read the page server-side →
 * AI summary via the selected chat provider, with length control). Both run
 * same-origin — no extra backend needed.
 */
export default function WebTools({ settings, initialMode }: Props) {
  const [mode, setMode] = useState<WebMode>(initialMode ?? 'preview')
  const [url, setUrl] = useState('')
  const [preview, setPreview] = useState<WebUnfurl | null>(null)
  const [result, setResult] = useState('')
  const [detail, setDetail] = useState<SummaryDetail>('standard')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const [copied, setCopied] = useState(false)
  const [cardCopied, setCardCopied] = useState(false)
  // One-shot auto-preview per pasted URL (cleared when the URL changes).
  const autoRef = useRef<string | null>(null)

  const switchMode = (m: WebMode) => {
    setMode(m)
    setPreview(null)
    setResult('')
    setErr('')
  }

  const runPreview = useCallback(async () => {
    if (!url.trim() || busy) return
    setBusy(true)
    setErr('')
    setPreview(null)
    setResult('')
    try {
      setPreview(await unfurl(url))
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Preview failed.')
    } finally {
      setBusy(false)
    }
  }, [url, busy])

  // Auto-fetch the preview shortly after a URL lands in the box (paste or
  // typing) — but only once per URL so it doesn't loop on focus changes.
  useEffect(() => {
    if (mode !== 'preview' || busy) return
    const t = url.trim()
    if (!URL_RE.test(t)) {
      autoRef.current = null
      return
    }
    if (autoRef.current === t) return
    const h = setTimeout(() => {
      autoRef.current = t
      void runPreview()
    }, 900)
    return () => clearTimeout(h)
  }, [url, mode, busy, runPreview])

  const runArticle = async () => {
    if (!url.trim() || busy) return
    setBusy(true)
    setErr('')
    setPreview(null)
    setResult('')
    try {
      const r = await articleSummary({
        url,
        detail,
        provider: settings.provider,
        model: settings.model,
        openrouterKey: settings.openrouterKey || undefined,
        geminiKey: settings.geminiKey || undefined,
        xkiroKey: settings.xkiroKey || undefined,
        opencodeKey: settings.opencodeKey || undefined,
      })
      setPreview(r.meta)
      setResult(r.result)
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Summary failed.')
    } finally {
      setBusy(false)
    }
  }

  const copy = () => {
    void navigator.clipboard.writeText(result)
    setCopied(true)
    setTimeout(() => setCopied(false), 1200)
  }

  const copyCard = () => {
    if (!preview) return
    const md = [
      `[${preview.title || preview.url}](${preview.url})`,
      preview.description || '',
      preview.image ? `![${preview.siteName || 'preview'}](${preview.image})` : '',
    ]
      .filter(Boolean)
      .join('\n\n')
    void navigator.clipboard.writeText(md)
    setCardCopied(true)
    setTimeout(() => setCardCopied(false), 1200)
  }

  return (
    <>
      <div className="tool-tabs">
        <button
          type="button"
          className={`tool-tab ${mode === 'preview' ? 'active' : ''}`}
          onClick={() => switchMode('preview')}
        >
          <Link2 size={16} /> <span>Link preview</span>
        </button>
        <button
          type="button"
          className={`tool-tab ${mode === 'article' ? 'active' : ''}`}
          onClick={() => switchMode('article')}
        >
          <FileText size={16} /> <span>Article summary</span>
        </button>
      </div>

      <textarea
        className="tool-input yt-url"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        placeholder={
          mode === 'preview' ? 'Paste any link to preview…' : 'Paste an article link to summarize…'
        }
        rows={2}
      />

      {mode === 'article' && (
        <label className="option-row">
          <span>Summary length</span>
          <div className="lang-chips">
            {DETAILS.map((d) => (
              <button
                key={d.id}
                type="button"
                className={`lang-chip ${detail === d.id ? 'active' : ''}`}
                onClick={() => setDetail(d.id)}
              >
                {d.label}
              </button>
            ))}
          </div>
        </label>
      )}

      <button
        className="primary"
        onClick={() => void (mode === 'preview' ? runPreview() : runArticle())}
        disabled={busy || !url.trim()}
      >
        {busy ? (
          <Loader2 size={15} className="spin" />
        ) : mode === 'preview' ? (
          <Globe size={15} />
        ) : (
          <FileText size={15} />
        )}
        {busy
          ? mode === 'preview'
            ? 'Fetching preview…'
            : 'Summarizing…'
          : mode === 'preview'
            ? 'Preview link'
            : 'Summarize article'}
      </button>

      {err && <p className="hint warn">{err}</p>}

      {preview && (
        <div className="yt-card yt-dl-preview">
          {preview.image && (
            <img
              className="yt-thumb"
              src={preview.image}
              alt=""
              loading="lazy"
              onError={(e) => (e.currentTarget.style.display = 'none')}
            />
          )}
          <div className="yt-facts">
            <h3>{preview.title}</h3>
            {preview.siteName && <p className="yt-muted">{preview.siteName}</p>}
            {preview.description && <p className="yt-muted">{preview.description}</p>}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
              <a className="ghost" href={preview.url} target="_blank" rel="noreferrer">
                <ExternalLink size={14} /> <span>Open original</span>
              </a>
              <button type="button" className="ghost" onClick={copyCard}>
                {cardCopied ? <Check size={14} /> : <Copy size={14} />}
                <span>{cardCopied ? 'Copied' : 'Copy card'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {result && (
        <div className="result">
          <div className="result-head">
            <span>Summary</span>
            <button className="ghost" onClick={copy}>
              {copied ? <Check size={14} /> : <Copy size={14} />}
              <span>{copied ? 'Copied' : 'Copy'}</span>
            </button>
          </div>
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{result}</ReactMarkdown>
        </div>
      )}
    </>
  )
}