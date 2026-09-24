// Browser speech helpers — speech-to-text (mic) and text-to-speech (read aloud).
// 100% free: both use the browser's built-in Web Speech APIs, no API keys, no
// server calls. Recognition needs Chrome/Edge (webkitSpeechRecognition); the
// UI hides the mic button when it is unavailable. TTS works in all modern
// browsers with local/system voices.

export const sttSupported =
  typeof window !== 'undefined' &&
  !!(window.SpeechRecognition || window.webkitSpeechRecognition)

export const ttsSupported =
  typeof window !== 'undefined' && 'speechSynthesis' in window

export interface VoiceInputHandlers {
  /** Final transcript so far + any interim (still being recognized) text. */
  onResult: (finalText: string, interimText: string) => void
  onEnd: () => void
  onError: (message: string) => void
}

/** Start listening with the mic. Returns a stop function, or null if unsupported. */
export function startVoiceInput(handlers: VoiceInputHandlers): (() => void) | null {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition
  if (!SR) return null
  try {
    const rec = new SR()
    rec.lang = navigator.language || 'en-US'
    rec.continuous = true
    rec.interimResults = true
    rec.maxAlternatives = 1

    let finalBuf = ''
    rec.onresult = (e) => {
      let interim = ''
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i]
        if (r.isFinal) finalBuf += r[0].transcript
        else interim += r[0].transcript
      }
      handlers.onResult(finalBuf, interim)
    }
    rec.onend = () => handlers.onEnd()
    rec.onerror = (e) => handlers.onError(e?.error || 'Speech recognition failed')

    rec.start()
    return () => {
      try {
        rec.stop()
      } catch {
        // Already stopped.
      }
    }
  } catch {
    return null
  }
}

// ---- Text-to-speech ----

let voicesLoaded = false
let cachedVoices: SpeechSynthesisVoice[] = []

function loadVoices(): SpeechSynthesisVoice[] {
  if (!ttsSupported) return []
  if (!voicesLoaded) {
    cachedVoices = window.speechSynthesis.getVoices()
    window.speechSynthesis.onvoiceschanged = () => {
      cachedVoices = window.speechSynthesis.getVoices()
    }
    voicesLoaded = true
  }
  if (!cachedVoices.length) cachedVoices = window.speechSynthesis.getVoices()
  return cachedVoices
}

/** Prefer a clear English voice: natural/neural first, then the classic ones. */
export function pickVoice(): SpeechSynthesisVoice | undefined {
  const voices = loadVoices()
  const en = voices.filter((v) => v.lang.toLowerCase().startsWith('en'))
  return (
    en.find((v) => /natural|neural/i.test(v.name)) ||
    en.find((v) => /google|david|zira|aria|jenny|guy|sonia|cora/i.test(v.name)) ||
    en[0] ||
    voices[0]
  )
}

/** Strip markdown-ish noise so TTS reads clean prose, then split into chunks. */
function chunkText(text: string): string[] {
  const cleaned = text.replace(/[#*_`>~\[\]()]/g, '').replace(/\s+/g, ' ').trim()
  if (!cleaned) return []
  const sentences = cleaned.match(/[^.!?]+[.!?]+|[^.!?]+$/g) ?? [cleaned]
  const chunks: string[] = []
  let cur = ''
  for (const s of sentences) {
    const t = s.trim()
    if (!t) continue
    if ((cur + ' ' + t).length > 240) {
      if (cur) chunks.push(cur)
      cur = t
    } else {
      cur = cur ? `${cur} ${t}` : t
    }
  }
  if (cur) chunks.push(cur)
  return chunks.length ? chunks : [cleaned]
}

/** Speak text aloud (replaces anything currently playing). */
export function speak(text: string, opts?: { onEnd?: () => void }): void {
  if (!ttsSupported || !text.trim()) return
  window.speechSynthesis.cancel()
  const parts = chunkText(text)
  if (!parts.length) return
  const voice = pickVoice()
  parts.forEach((part, i) => {
    const u = new SpeechSynthesisUtterance(part)
    if (voice) u.voice = voice
    u.rate = 1
    u.pitch = 1
    u.volume = 1
    if (i === parts.length - 1 && opts?.onEnd) u.onend = opts.onEnd
    window.speechSynthesis.speak(u)
  })
}

export function stopSpeaking(): void {
  if (ttsSupported) window.speechSynthesis.cancel()
}