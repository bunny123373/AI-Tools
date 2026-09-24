import { useState } from 'react'
import type { ReactNode } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import {
  Check,
  Clock3,
  Copy,
  Download,
  ExternalLink,
  FileText,
  ImageDown,
  Info,
  ListVideo,
  Loader2,
  MonitorPlay,
  Music2,
  Sparkles,
  Video,
} from 'lucide-react'
import type { Settings, YtDurationItem, YtMode, YouTubeInfo } from '../types'
import { fetchYtThumb, ytDownload, ytDuration, ytInfo, ytTitle, ytTranscript } from '../api'

const TABS: { mode: YtMode; label: string; icon: typeof Info }[] = [
  { mode: 'info', label: 'Video info', icon: Info },
  { mode: 'transcript', label: 'Transcript', icon: FileText },
  { mode: 'title', label: 'Title pack', icon: Sparkles },
  { mode: 'playlist', label: 'Playlist total', icon: ListVideo },
  { mode: 'download', label: 'Download', icon: Download },
]

function saveBlob(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = name
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 3000)
}

function CopyBtn({ text }: { text: string }) {
  const [done, setDone] = useState(false)
  if (!text) return null
  return (
    <button
      type="button"
      className="ghost"
      onClick={() => {
        void navigator.clipboard.writeText(text)
        setDone(true)
        setTimeout(() => setDone(false), 1200)
      }}
    >
      {done ? <Check size={14} /> : <Copy size={14} />}
      <span>{done ? 'Copied' : 'Copy'}</span>
    </button>
  )
}

export default function YoutubeTools({
  settings,
  initialMode,
}: {
  settings: Settings
  initialMode?: YtMode
}) {
  const [mode, setMode] = useState<YtMode>(initialMode ?? 'info')
  const [url, setUrl] = useState('')
  const [goals, setGoals] = useState('')
  const [dlKind, setDlKind] = useState<'audio' | 'video'>('video')

  const [info, setInfo] = useState<YouTubeInfo | null>(null)
  const [transcript, setTranscript] = useState('')
  const [transcriptLabel, setTranscriptLabel] = useState('')
  const [titleResult, setTitleResult] = useState('')
  const [playlist, setPlaylist] = useState<{ items: YtDurationItem[]; totalLabel: string; truncated: boolean } | null>(null)

  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  const switchMode = (m: YtMode) => {
    setMode(m)
    setErr('')
  }

  const runInfo = async () => {
    if (!url.trim() || busy) return
    setBusy(true)
    setErr('')
    try {
      setInfo(await ytInfo(url))
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Could not fetch the video.')
    } finally {
      setBusy(false)
    }
  }

  const runTranscript = async () => {
    if (!url.trim() || busy) return
    setBusy(true)
    setErr('')
    try {
      const r = await ytTranscript(url)
      setTranscript(r.transcript)
      setTranscriptLabel(r.label ? `${r.label}${r.lang ? ` (${r.lang})` : ''}` : '')
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Transcript fetch failed.')
    } finally {
      setBusy(false)
    }
  }

  const runTitle = async () => {
    if (!url.trim() || busy) return
    setBusy(true)
    setErr('')
    try {
      const r = await ytTitle({
        url,
        goals,
        provider: settings.provider,
        model: settings.model,
        openrouterKey: settings.openrouterKey || undefined,
        geminiKey: settings.geminiKey || undefined,
        xkiroKey: settings.xkiroKey || undefined,
        ollamaBaseUrl: settings.ollamaBaseUrl || undefined,
      })
      setTitleResult(r.result)
      setInfo(r.info)
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'AI request failed.')
    } finally {
      setBusy(false)
    }
  }

  const runPlaylist = async () => {
    if (!url.trim() || busy) return
    setBusy(true)
    setErr('')
    try {
      const r = await ytDuration(url)
      setPlaylist({ items: r.items, totalLabel: r.totalLabel, truncated: r.truncated })
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Playlist calculation failed.')
    } finally {
      setBusy(false)
    }
  }

  const runDownload = async () => {
    if (!url.trim() || busy) return
    setBusy(true)
    setErr('')
    try {
      const { blob, name } = await ytDownload(url, dlKind)
      saveBlob(blob, name)
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Download failed.')
    } finally {
      setBusy(false)
    }
  }

  const saveThumb = async () => {
    if (!info) return
    try {
      saveBlob(await fetchYtThumb(info.url), `${info.id}.jpg`)
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Thumbnail save failed.')
    }
  }

  const panel = (): ReactNode => {
    if (mode === 'info') {
      return (
        <>
          <textarea
            className="tool-input yt-url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="Paste a YouTube link — e.g. https://www.youtube.com/watch?v=…"
            rows={2}
          />
          <button className="primary" onClick={() => void runInfo()} disabled={busy || !url.trim()}>
            {busy ? <Loader2 size={15} className="spin" /> : <Info size={15} />} Get video info
          </button>
          {info && (
            <div className="yt-card">
              <img className="yt-thumb" src={info.thumbnail} alt={info.title} loading="lazy" />
              <div className="yt-facts">
                <h3>{info.title}</h3>
                {info.author && <p className="yt-muted">{info.author}</p>}
                <p className="yt-muted">Video ID: {info.id}</p>
                <p className="yt-muted">
                  {info.durationSec !== null ? `Duration: ${fmtSec(info.durationSec)}` : 'Duration: unknown'}
                </p>
                <div className="yt-actions">
                  <button className="ghost" onClick={() => void saveThumb()}>
                    <ImageDown size={14} /> Save thumbnail
                  </button>
                  <a className="ghost" href={info.url} target="_blank" rel="noreferrer">
                    <ExternalLink size={14} /> Watch
                  </a>
                </div>
              </div>
            </div>
          )}
        </>
      )
    }

    if (mode === 'transcript') {
      return (
        <>
          <textarea
            className="tool-input yt-url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="Paste a YouTube link to pull its captions…"
            rows={2}
          />
          <button className="primary" onClick={() => void runTranscript()} disabled={busy || !url.trim()}>
            {busy ? <Loader2 size={15} className="spin" /> : <FileText size={15} />} Get transcript
          </button>
          {(transcript || busy) && (
            <div className="result yt-transcript">
              <div className="result-head">
                <span>
                  Transcript{transcriptLabel ? ` · ${transcriptLabel}` : ''}
                  {transcript ? ` · ${transcript.split(/\s+/).length} words` : ''}
                </span>
                <CopyBtn text={transcript} />
              </div>
              {busy ? (
                <p className="hint">Fetching captions…</p>
              ) : (
                <pre className="yt-pre">{transcript}</pre>
              )}
            </div>
          )}
        </>
      )
    }

    if (mode === 'title') {
      return (
        <>
          <textarea
            className="tool-input yt-url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="Paste a YouTube link — the AI reads the video metadata…"
            rows={2}
          />
          <label className="option-row">
            <span>Goals / notes (optional)</span>
            <textarea
              className="yt-goals"
              value={goals}
              onChange={(e) => setGoals(e.target.value)}
              placeholder="e.g. my audience is beginners; I want a funny, casual tone"
              rows={2}
            />
          </label>
          <button className="primary" onClick={() => void runTitle()} disabled={busy || !url.trim()}>
            {busy ? <Loader2 size={15} className="spin" /> : <Sparkles size={15} />} Generate titles, description & tags
          </button>
          {titleResult && (
            <div className="result">
              <div className="result-head">
                <span>YouTube package</span>
                <CopyBtn text={titleResult} />
              </div>
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{titleResult}</ReactMarkdown>
            </div>
          )}
        </>
      )
    }

    if (mode === 'playlist') {
      return (
        <>
          <textarea
            className="tool-input yt-url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder={'Paste one YouTube link per line — the total runtime is calculated for all of them.'}
            rows={6}
          />
          <button className="primary" onClick={() => void runPlaylist()} disabled={busy || !url.trim()}>
            {busy ? <Loader2 size={15} className="spin" /> : <Clock3 size={15} />} Calculate total
          </button>
          {playlist && (
            <div className="result yt-playlist">
              <div className="result-head">
                <span>
                  <Clock3 size={14} /> Total: <strong>{playlist.totalLabel}</strong>
                  {playlist.truncated ? ' (first 60 links)' : ''}
                </span>
              </div>
              <ul className="yt-list">
                {playlist.items.map((it, i) => (
                  <li key={i} className={it.error ? 'yt-err' : ''}>
                    <span className="yt-list-title">
                      {it.error ? it.title || it.url : it.title || it.url}
                    </span>
                    <span className="yt-list-time">{it.error ? it.error : fmtSec(it.durationSec ?? 0)}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )
    }

    // download
    return (
      <>
        <p className="hint yt-note">
          Downloads run on the <strong>server</strong> with Python (yt-dlp) — nothing to install
          on your device. The first download may take up to a minute while the server sets yt-dlp up.
        </p>
        <textarea
          className="tool-input yt-url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="Paste a YouTube link to download…"
          rows={2}
        />
        <div className="yt-dl-choice">
          <button
            type="button"
            className={`lang-chip ${dlKind === 'video' ? 'active' : ''}`}
            onClick={() => setDlKind('video')}
          >
            <Video size={14} /> MP4 video (≤1080p)
          </button>
          <button
            type="button"
            className={`lang-chip ${dlKind === 'audio' ? 'active' : ''}`}
            onClick={() => setDlKind('audio')}
          >
            <Music2 size={14} /> M4A audio
          </button>
        </div>
        <button className="primary" onClick={() => void runDownload()} disabled={busy || !url.trim()}>
          {busy ? <Loader2 size={15} className="spin" /> : <Download size={15} />} Download
        </button>
        {busy && <p className="hint">Preparing your download… large files take a moment.</p>}
      </>
    )
  }

  return (
    <div className="yt-tools">
      <div className="yt-tabs">
        {TABS.map((t) => (
          <button
            key={t.mode}
            type="button"
            className={`yt-tab ${mode === t.mode ? 'active' : ''}`}
            onClick={() => switchMode(t.mode)}
          >
            <t.icon size={14} />
            <span>{t.label}</span>
          </button>
        ))}
      </div>
      <div className="yt-body">
        <div className="yt-head">
          <MonitorPlay size={18} />
          <span>YouTube tools — all free, no API key required</span>
        </div>
        {panel()}
        {err && <p className="hint warn">{err}</p>}
      </div>
    </div>
  )
}

function fmtSec(sec: number): string {
  const s = Math.max(0, Math.round(sec))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const ss = s % 60
  const mm = String(m).padStart(2, '0')
  const tss = String(ss).padStart(2, '0')
  return h > 0 ? `${h}:${mm}:${tss}` : `${m}:${tss}`
}