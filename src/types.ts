export interface ChatMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
  /**
   * Downscaled image attached to a user message (vision chat analysis).
   * Kept in history so an opened conversation re-shows the attachment.
   */
  imageDataUrl?: string
  /** Generated image (data URL) attached to an assistant message. */
  image?: string
  /** Caption / prompt shown under a generated image message. */
  imageLabel?: string
  /**
   * Model that actually replied. Set when "Auto" resolved or the vision
   * auto-switch kicked in for an image message.
   */
  usedModel?: string
}

export interface ProviderInfo {
  id: string
  name: string
  requiresKey: boolean
  keyLabel: string
  keyHint: string
  free: string
}

export interface ModelChoice {
  id: string
  name: string
  provider: string
  free?: boolean
}

export interface ModelListResult {
  models: ModelChoice[]
  note?: string
}

export interface Settings {
  provider: string
  model: string
  openrouterKey: string
  geminiKey: string
  xkiroKey: string
  webSearchKey: string
  ollamaBaseUrl: string
}

export interface PromptItem {
  id: string
  title: string
  prompt: string
  tag: string
}

export interface ChatPayload {
  provider: string
  model: string
  messages: ChatMessage[]
  web?: boolean
  openrouterKey?: string
  geminiKey?: string
  xkiroKey?: string
  webSearchKey?: string
  ollamaBaseUrl?: string
}

export interface SearchSource {
  title: string
  url: string
  snippet: string
}

export type ToolKind = 'summarize' | 'improve' | 'translate' | 'proofread' | 'pdf' | 'youtube'

/** YouTube tools sub-modes (inside the Tools tab). */
export type YtMode = 'info' | 'transcript' | 'title' | 'playlist' | 'download'

/** Video metadata returned by /api/tools/youtube/info. */
export interface YouTubeInfo {
  id: string
  url: string
  title: string
  author: string
  thumbnail: string
  durationSec: number | null
}

/** One playlist row from /api/tools/youtube/duration. */
export interface YtDurationItem {
  url: string
  id: string | null
  title?: string
  durationSec: number | null
  error?: string
}

export interface HistorySummary {
  id: string
  title: string
  createdAt: string
  updatedAt: string
  count: number
}

export interface HistoryChat {
  id: string
  userId: string
  title: string
  messages: ChatMessage[]
  createdAt: string
  updatedAt: string
}

export interface ChatRequest {
  provider: string
  model: string
  messages: ChatMessage[]
  web?: boolean
  openrouterKey?: string
  geminiKey?: string
  xkiroKey?: string
  webSearchKey?: string
  ollamaBaseUrl?: string
}