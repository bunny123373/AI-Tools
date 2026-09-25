import { useRef, useState } from 'react'
import { Check, Copy, FileUp, Loader2, Mic, X } from 'lucide-react'
import type { Settings } from '../types'
import { transcribeAudio } from '../api'

// Keep base64 payloads under the server limit at a comfortable margin.
const MAX_B64 = 3_000_000

interface Props {
  settings: Settings
}

/**
 * Audio → text transcription. Upload any common audio file; transcription
 * runs on Gemini (Google's servers) via the same provider key used for chat
 * (your Settings key, falling back to the site key on the server).
 */
export default function TranscribeTools({ settings }: Props) {
  const [file, setFile] = useState<{ name: string; dataUrl: string } | null>(null)
  const [result, setResult] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const [copied, setCopied] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const pick = (f: File | undefined | null) => {
    if (!f) return
    const okType = f.type.startsWith('audio/') || /\.(mp3|wav|m4a|ogg|wma|aac|flac|opus)$/i.test(f.name)
    if (!okType) {
      setErr('Please choose an audio file (MP3, WAV, M4A, OGG, AAC, FLAC…).')
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      const dataUrl = String(reader.result ?? '')
      if (dataUrl.length > MAX_B64) {
        setErr('Audio file too large — keep clips under ~2–3 minutes.')
        return
      }
      setFile({ name: f.name, dataUrl })
      setErr('')
      setResult('')
    }
    reader.onerror = () => setErr('Could not read that file.')
    reader.readAsDataURL(f)
  }

  const run = async () => {
    if (!file || busy) return
    setBusy(true)
    setErr('')
    setResult('')
    try {
      const r = await transcribeAudio({
        audioDataUrl: file.dataUrl,
        model: settings.provider === 'gemini' ? settings.model : '',
        geminiKey: settings.geminiKey || undefined,
      })
      setResult(r.result)
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Transcription failed.')
    } finally {
      setBusy(false)
    }
  }

  const copy = () => {
    void navigator.clipboard.writeText(result)
    setCopied(true)
    setTimeout(() => setCopied(false), 1200)
  }

  return (
    <>
      <div className="pdf-upload" onClick={() => inputRef.current?.click()}>
        <input
          ref={inputRef}
          type="file"
          accept="audio/*,.mp3,.wav,.m4a,.ogg,.aac,.flac"
          style={{ display: 'none' }}
          onChange={(e) => {
            pick(e.target.files?.[0])
            e.currentTarget.value = ''
          }}
        />
        {file ? (
          <div className="file-chip" onClick={(e) => e.stopPropagation()}>
            <Mic size={15} />
            <span className="file-chip-name">{file.name}</span>
            <button
              type="button"
              className="icon-btn"
              onClick={() => {
                setFile(null)
                setResult('')
                setErr('')
              }}
              aria-label="Remove file"
            >
              <X size={14} />
            </button>
          </div>
        ) : (
          <span className="pdf-upload-hint">
            <FileUp size={18} /> Click to choose an audio file…
          </span>
        )}
      </div>

      <button
        className="primary"
        onClick={() => void run()}
        disabled={busy || !file}
      >
        {busy ? <Loader2 size={15} className="spin" /> : <Mic size={15} />}
        {busy ? 'Transcribing…' : 'Transcribe'}
      </button>

      {err && <p className="hint warn">{err}</p>}
      <p className="hint">
        <Mic size={13} /> Transcription runs on <strong>Gemini</strong> — no local model, no extra install.
        Works with the Gemini key in Settings (or the site key). Clips up to ~2–3 minutes.
      </p>

      {result && (
        <div className="result">
          <div className="result-head">
            <span>Transcript</span>
            <button className="ghost" onClick={copy}>
              {copied ? <Check size={14} /> : <Copy size={14} />}
              <span>{copied ? 'Copied' : 'Copy'}</span>
            </button>
          </div>
          <p style={{ whiteSpace: 'pre-wrap' }}>{result}</p>
        </div>
      )}
    </>
  )
}