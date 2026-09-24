import type { ChatPayload, HistoryChat, HistorySummary, ModelListResult, ProviderInfo, SearchSource, Settings, ToolKind, YtDurationItem, YouTubeInfo } from './types'

const SETTINGS_KEY = 'ai-toolbox-settings'

export const DEFAULT_SETTINGS: Settings = {
  provider: 'ollama',
  model: '',
  openrouterKey: '',
  geminiKey: '',
  xkiroKey: 'sk-xt-da8bbf8ca7493566b7fca3f600dcec43a30d9d4ece4398bb',
  webSearchKey: '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',
  ollamaBaseUrl: 'http://localhost:11434',
}

export function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY)
    if (raw) {
      const merged = { ...DEFAULT_SETTINGS, ...(JSON.parse(raw) as Partial<Settings>) }
      // Prefilled helper keys (web search) are applied even when an older
      // saved settings object stored an empty string.
      if (!merged.webSearchKey) merged.webSearchKey = DEFAULT_SETTINGS.webSearchKey
      return merged
    }
  } catch {
    // ignore
  }
  return { ...DEFAULT_SETTINGS }
}

export function saveSettings(s: Settings): void {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(s))
  } catch {
    // ignore
  }
}

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    headers: { 'Content-Type': 'application/json' },
    ...init,
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(
      (data as { error?: string }).error || `Request failed (${res.status})`,
    )
  }
  return data as T
}

export const fetchProviders = () => api<ProviderInfo[]>('/api/providers')

export const fetchModels = (provider: string, opts: { xkiroKey?: string } = {}) =>
  api<ModelListResult>(
    `/api/models?provider=${encodeURIComponent(provider)}${opts.xkiroKey ? `&key=${encodeURIComponent(opts.xkiroKey)}` : ''}`,
  )

export const sendChat = (payload: ChatPayload) =>
  api<{ reply: string; sources?: SearchSource[] }>('/api/chat', {
    method: 'POST',
    body: JSON.stringify(payload),
  })

export const runTool = (kind: ToolKind, payload: Record<string, unknown>) =>
  api<{ result: string }>(`/api/tools/${kind}`, {
    method: 'POST',
    body: JSON.stringify(payload),
  })

// ---- YouTube tools ----
// The YouTube APIs live in the repo's backend/ service (Render). When
// NEXT_PUBLIC_YT_API_URL is set (Vercel/cloud), the client calls the remote
// backend; otherwise it falls back to the same-origin Next routes (local dev).

const YT_BASE = (process.env.NEXT_PUBLIC_YT_API_URL || '').replace(/\/+$/, '')
const ytPath = (remote: string, local: string) => (YT_BASE ? `${YT_BASE}${remote}` : local)

export const ytInfo = (url: string) =>
  api<YouTubeInfo>(ytPath('/youtube/info', '/api/tools/youtube/info'), {
    method: 'POST',
    body: JSON.stringify({ url }),
  })

export const ytTranscript = (url: string) =>
  api<{ transcript: string; lang: string; label: string }>(
    ytPath('/youtube/transcript', '/api/tools/youtube/transcript'),
    {
      method: 'POST',
      body: JSON.stringify({ url }),
    },
  )

// AI title/description/tags runs on the app server (it needs provider keys).
export const ytTitle = (payload: Record<string, unknown>) =>
  api<{ result: string; info: YouTubeInfo }>('/api/tools/youtube/title', {
    method: 'POST',
    body: JSON.stringify(payload),
  })

export const ytDuration = (urls: string) =>
  api<{ items: YtDurationItem[]; totalSec: number; totalLabel: string; truncated: boolean }>(
    ytPath('/youtube/duration', '/api/tools/youtube/duration'),
    { method: 'POST', body: JSON.stringify({ urls }) },
  )

/** Thumbnail bytes (client saves them locally — avoids CORS via the server). */
export const fetchYtThumb = async (videoUrl: string): Promise<Blob> => {
  const res = await fetch(`${ytPath('/youtube/thumb', '/api/tools/youtube/thumb')}?url=${encodeURIComponent(videoUrl)}`)
  if (!res.ok) throw new Error('Could not fetch the thumbnail.')
  return res.blob()
}

/** Download a video/audio file through the backend (streams the bytes). */
export const ytDownload = async (
  url: string,
  kind: 'audio' | 'video',
): Promise<{ blob: Blob; name: string }> => {
  const res = await fetch(ytPath('/youtube/download', '/api/tools/youtube/download'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url, kind }),
  })
  if (!res.ok) {
    const data = (await res.json().catch(() => ({}))) as { error?: string }
    throw new Error(data.error || 'Download failed.')
  }
  const blob = await res.blob()
  const m = (res.headers.get('Content-Disposition') || '').match(/filename="([^"]+)"/)
  if (m) return { blob, name: m[1] }
  const idMatch = url.match(/youtu\.be\/([\w-]+)/)?.[1] || 'video'
  return { blob, name: `${idMatch}.${kind === 'audio' ? 'm4a' : 'mp4'}` }
}

export const analyzeImage = (payload: Record<string, unknown>) =>
  api<{ result: string; model?: string; autoSwitched?: boolean }>('/api/tools/image/analyze', {
    method: 'POST',
    body: JSON.stringify(payload),
  })

// ---- Chat history (per-user, server-side) ----

export const listChats = () => api<{ ok: boolean; chats: HistorySummary[] }>('/api/history')

export const getChat = (id: string) =>
  api<{ ok: boolean; chat: HistoryChat }>(`/api/history/${encodeURIComponent(id)}`)

export const createChat = (payload: { title?: string; messages?: ChatPayload['messages'] }) =>
  api<{ ok: boolean; chat: HistoryChat }>('/api/history', {
    method: 'POST',
    body: JSON.stringify(payload),
  })

export const saveChat = (id: string, payload: { title: string; messages: ChatPayload['messages'] }) =>
  api<{ ok: boolean; chat: HistoryChat }>(`/api/history/${encodeURIComponent(id)}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  })

export const deleteChat = (id: string) =>
  api<{ ok: boolean }>(`/api/history/${encodeURIComponent(id)}`, { method: 'DELETE' })

export interface GenerateImagePayload {
  prompt: string
  width: number
  height: number
  seed: number
  model: string
  provider?: 'gemini' | 'pollinations' | 'puter'
  geminiKey?: string
}

export const generateImage = async (payload: GenerateImagePayload): Promise<Blob> => {
  const { blob } = await generateImageInfo(payload)
  return blob
}

// Like generateImage, but also reports which model actually rendered the image
// (Puter auto-falls back to a cheaper model when the free allowance is low).
export const generateImageInfo = async (payload: GenerateImagePayload): Promise<{
  blob: Blob
  usedModel?: string
}> => {
  const res = await fetch('/api/tools/image/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw new Error((data as { error?: string }).error || `Image service returned HTTP ${res.status}`)
  }
  return { blob: await res.blob(), usedModel: res.headers.get('X-Used-Model') || undefined }
}

export interface GenerateVideoPayload {
  prompt: string
  model?: string
  seconds?: number
  /** Free sample clip (Puter test_mode) — still validates the model. */
  testMode?: boolean
}

export const generateVideo = async (payload: GenerateVideoPayload): Promise<Blob> => {
  const res = await fetch('/api/tools/video/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw new Error((data as { error?: string }).error || `Video service returned HTTP ${res.status}`)
  }
  return res.blob()
}

const PROMPTS_KEY = 'ai-toolbox-prompts'

export function loadPrompts(): { title: string; prompt: string; tag: string }[] {
  try {
    const raw = localStorage.getItem(PROMPTS_KEY)
    if (raw) return JSON.parse(raw)
  } catch {
    // ignore
  }
  return [
    {
      title: 'Explain simply',
      prompt: 'Explain this topic to me as if I were 12 years old, with simple words and one everyday analogy.',
      tag: 'Learning',
    },
    {
      title: 'Fix grammar & style',
      prompt: 'Proofread the text below. Fix grammar, spelling, and punctuation, and improve the flow. Show the corrected version only.',
      tag: 'Writing',
    },
    {
      title: 'Youtube script outline',
      prompt: 'Create a structured outline for a YouTube video script about the topic below, with a hook, 4 sections, and a call to action.',
      tag: 'Content',
    },
    {
      title: 'Email reply',
      prompt: "Write a polite, professional email reply to the message below. Keep it under 120 words and end with a clear next step.",
      tag: 'Work',
    },
    {
      title: 'Study flashcards',
      prompt: 'Turn the notes below into 10 study flashcards in the format Q: ... / A: ...',
      tag: 'Learning',
    },
  ]
}

export function savePrompts(prompts: { title: string; prompt: string; tag: string }[]): void {
  try {
    localStorage.setItem(PROMPTS_KEY, JSON.stringify(prompts))
  } catch {
    // ignore
  }
}