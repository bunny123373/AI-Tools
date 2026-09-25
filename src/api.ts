import type { ChatPayload, HistoryChat, HistorySummary, ModelListResult, ProviderInfo, SearchSource, Settings, ToolKind, WebArticle, WebUnfurl } from './types'

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



export const analyzeImage = (payload: Record<string, unknown>) =>
  api<{ result: string; model?: string; autoSwitched?: boolean }>('/api/tools/image/analyze', {
    method: 'POST',
    body: JSON.stringify(payload),
  })

// ---- Web tools (link preview + article summary) ----

/** Fetch any URL server-side and return preview metadata. */
export const unfurl = (url: string) =>
  api<WebUnfurl>('/api/tools/web/fetch', {
    method: 'POST',
    body: JSON.stringify({ url }),
  })

/** Fetch an article URL and summarize it with the selected AI provider. */
export const articleSummary = (payload: Record<string, unknown>) =>
  api<WebArticle>('/api/tools/web/article', {
    method: 'POST',
    body: JSON.stringify(payload),
  })

/** Upload audio → text transcript via Gemini. */
export const transcribeAudio = (payload: Record<string, unknown>) =>
  api<{ result: string; model?: string }>('/api/tools/audio/transcribe', {
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
  provider?: 'gemini' | 'pollinations' | 'puter' | 'xkiro'
  geminiKey?: string
  xkiroKey?: string
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