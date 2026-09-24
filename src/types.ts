export interface ChatMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
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

export type ToolKind = 'summarize' | 'improve' | 'translate' | 'proofread' | 'pdf'

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