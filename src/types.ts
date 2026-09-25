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
  opencodeKey: string
  webSearchKey: string
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
  opencodeKey?: string
  webSearchKey?: string
}

export interface SearchSource {
  title: string
  url: string
  snippet: string
}

export type ToolKind = 'summarize' | 'improve' | 'translate' | 'proofread' | 'pdf' | 'web' | 'transcribe'

/** Web tools sub-modes (inside the Tools tab). */
export type WebMode = 'preview' | 'article'

/** Link preview metadata from /api/tools/web/fetch. */
export interface WebUnfurl {
  url: string
  title: string
  description: string
  image: string
  siteName: string
  ok: boolean
}

/** Article summary result from /api/tools/web/article. */
export interface WebArticle {
  result: string
  meta: WebUnfurl
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
  opencodeKey?: string
  webSearchKey?: string
}