import type { ChatMessage, ChatRequest, ModelChoice, ModelListResult, ProviderInfo } from './types'

export const PROVIDERS: ProviderInfo[] = [
  {
    id: 'openrouter',
    name: 'OpenRouter (free models)',
    requiresKey: true,
    keyLabel: 'OpenRouter API key',
    keyHint: 'Free key at https://openrouter.ai/keys — many free models cost $0',
    free: 'Free models available',
  },
  {
    id: 'gemini',
    name: 'Google Gemini (free tier)',
    requiresKey: true,
    keyLabel: 'Gemini API key',
    keyHint: 'Free key at https://aistudio.google.com/apikey — free tier included',
    free: 'Has a free tier',
  },
  {
    id: 'xkiro',
    name: 'xkiro (free models)',
    requiresKey: true,
    keyLabel: 'xkiro API key',
    keyHint: 'OpenAI-compatible gateway at https://api.xkiro.com/v1 — free chat models use the ":free" suffix; free image generation with sensenova/sensenova-u1.5-lite.',
    free: 'Free models available (:free)',
  },
  {
    id: 'opencode',
    name: 'OpenCode (free allowance)',
    requiresKey: true,
    keyLabel: 'OpenCode API key',
    keyHint: 'Free `oc_sk_…` key from https://opencode.ai — works here with the Space Bunny model. Other Zen free models are restricted to the OpenCode app itself.',
    free: 'Free allowance (space-bunny-free)',
  },
  {
    id: 'puter',
    name: 'Puter (1000+ models · monthly allowance)',
    requiresKey: false,
    keyLabel: '',
    keyHint:
      'No key needed — one-time token via `npm run puter-token` (sign in on puter.com, approve). Free monthly allowance ≈ 1000 credits (≈$1): chat ≈ $0, images/video draw credits (Nano Banana ≈ $0.35/image, GPT Image 2 ≈ $0.03). Remaining allowance is shown when you pick Puter.',
    free: 'Free monthly allowance (≈$1/month) — resets monthly',
  },
]

/**
 * Default models per provider — used by "Auto" mode and when the settings
 * store has no model selected yet. `chat` = plain conversation default,
 * `vision` = the model used when an image needs analysis and the current
 * model can't see it (auto-switch).
 */
export const MODEL_DEFAULTS: Record<string, { chat: string; vision: string; visionLabel?: string }> = {
  openrouter: {
    chat: 'inclusionai/ling-3.0-flash-vl:free',
    vision: 'inclusionai/ling-3.0-flash-vl:free',
    visionLabel: 'Ling 3.0 Flash VL (free vision)',
  },
  xkiro: {
    chat: 'qwen/qwen3.8-omni-flash:free',
    vision: 'qwen/qwen3.8-omni-flash:free',
    visionLabel: 'Qwen3.8 Omni Flash (free)',
  },
  gemini: { chat: 'gemini-3.5-flash', vision: 'gemini-3.5-flash' },
  puter: { chat: 'gemini-3.5-flash-lite', vision: 'gemini-3.5-flash-lite' },
  opencode: { chat: 'space-bunny-free', vision: 'space-bunny-free' },
}

/** Does this provider+model combination accept images for analysis? */
export function isVisionCapable(provider: string, model: string): boolean {
  const id = (model || '').toLowerCase()
  // Gemini (and every Puter model) is multimodal — all models see images.
  if (provider === 'gemini' || provider === 'puter') return true
  // OpenAI-compatible gateways: any model marked vision/omni/vl/llava works.
  return /(vision|omni|\bvl\b|llava|glm-4v|\bqwen.*vl\b)/.test(id)
}

/** Resolve "auto"/empty model names to a concrete chat model. */
export function resolveChatModel(provider: string, model?: string): string {
  const m = (model || '').trim()
  if (!m || m === 'auto') return MODEL_DEFAULTS[provider]?.chat || m
  return m
}

export interface ResolvedVisionModel {
  model: string
  /** True when the current model cannot see images and we swapped models. */
  autoSwitched: boolean
}

/** Pick a vision-capable model for image analysis; auto-switch if needed. */
export function resolveVisionModel(provider: string, model?: string): ResolvedVisionModel {
  const cur = (model || '').trim()
  const fallback = MODEL_DEFAULTS[provider]?.vision || cur
  if (provider === 'gemini' || provider === 'puter') {
    // Every model on these providers is multimodal — no switch needed.
    return { model: resolveChatModel(provider, cur) || fallback, autoSwitched: false }
  }
  if (!cur || cur === 'auto') return { model: fallback, autoSwitched: false }
  if (isVisionCapable(provider, cur)) return { model: cur, autoSwitched: false }
  return { model: fallback, autoSwitched: true }
}

const STATIC_MODELS: Record<string, ModelChoice[]> = {
  openrouter: [
    { id: 'inclusionai/ling-3.0-flash-vl:free', name: 'Ling 3.0 Flash VL (free)', provider: 'openrouter', free: true },
    { id: 'inclusionai/ling-3.0-flash-sante:free', name: 'Ling 3.0 Flash Sante (free)', provider: 'openrouter', free: true },
    { id: 'inclusionai/ling-3.0-flash-fin:free', name: 'Ling 3.0 Flash Fin (free)', provider: 'openrouter', free: true },
  ],
  xkiro: [
    { id: 'qwen/qwen3.8-omni-flash:free', name: 'Qwen3.8 Omni Flash (free)', provider: 'xkiro', free: true },
    { id: 'qwen/qwen3.7-flash:free', name: 'Qwen3.7 Flash (free)', provider: 'xkiro', free: true },
    { id: 'qwen/qwen3-max:free', name: 'Qwen3 Max (free)', provider: 'xkiro', free: true },
    { id: 'minimax/minimax-m3:free', name: 'MiniMax M3 (free)', provider: 'xkiro', free: true },
    { id: 'minimax/minimax-m2.7-highspeed:free', name: 'MiniMax M2.7 Highspeed (free)', provider: 'xkiro', free: true },
    { id: 'mistralai/mistral-small-2603', name: 'Mistral Small 4 (free tier)', provider: 'xkiro', free: true },
  ],
  gemini: [
    { id: 'gemini-3.5-flash', name: 'Gemini 3.5 Flash (free tier)', provider: 'gemini', free: true },
    { id: 'gemini-3.5-flash-lite', name: 'Gemini 3.5 Flash-Lite (free tier)', provider: 'gemini', free: true },
    { id: 'gemini-3.1-flash-lite', name: 'Gemini 3.1 Flash-Lite (free tier)', provider: 'gemini', free: true },
    { id: 'gemini-flash-latest', name: 'Gemini Flash Latest (free tier)', provider: 'gemini', free: true },
    { id: 'gemini-flash-lite-latest', name: 'Gemini Flash-Lite Latest (free tier)', provider: 'gemini', free: true },
    { id: 'gemini-3-flash-preview', name: 'Gemini 3 Flash Preview (free tier)', provider: 'gemini', free: true },
  ],
  puter: [
    { id: 'gemini-3.5-flash-lite', name: 'Gemini 3.5 Flash-Lite (fastest)', provider: 'puter', free: true },
    { id: 'gemini-3.5-flash', name: 'Gemini 3.5 Flash', provider: 'puter', free: true },
    { id: 'gemini-3.6-flash', name: 'Gemini 3.6 Flash', provider: 'puter', free: true },
    { id: 'gemini-3.1-flash-lite', name: 'Gemini 3.1 Flash-Lite', provider: 'puter', free: true },
    { id: 'gemini-3-flash-preview', name: 'Gemini 3 Flash', provider: 'puter', free: true },
    { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash', provider: 'puter', free: true },
    { id: 'gemma-4-26b-a4b-it', name: 'Gemma 4 26B (fast open model)', provider: 'puter', free: true },
  ],
  opencode: [
    { id: 'space-bunny-free', name: 'Space Bunny (free Zen model)', provider: 'opencode', free: true },
  ],
}

function friendlyError(e: unknown, fallback: string): string {
  if (e instanceof Error && e.message) return e.message
  return fallback
}

async function fetchJson(url: string, init?: RequestInit): Promise<any> {
  const res = await fetch(url, init)
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    const detail =
      data?.error?.message || data?.error || data?.message || `HTTP ${res.status}`
    throw new Error(String(detail))
  }
  return data
}

// ---- Puter (https://puter.com) ----
// Free AI with a monthly allowance and 1000+ models. The Node SDK needs a
// one-time auth token (`npm run puter-token` → paste into PUTER_AUTH_TOKEN).
// The SDK instance is cached so the (heavy) `vm` bootstrap runs only once.
let puterInstance: any = null
let puterTokenUsed = ''

async function getPuter(): Promise<any> {
  const token = process.env.PUTER_AUTH_TOKEN || ''
  if (!token) {
    throw new Error(
      'Puter needs a one-time token. Run `npm run puter-token` (opens your browser, you sign in on puter.com), then paste the token into PUTER_AUTH_TOKEN in .env.local and restart the server.',
    )
  }
  if (puterInstance && puterTokenUsed === token) return puterInstance
  const mod: any = await import('@heyputer/puter.js/src/init.cjs')
  const init = mod.init ?? mod.default?.init ?? mod.default
  if (typeof init !== 'function') throw new Error('Puter SDK failed to initialize.')
  puterInstance = init(token)
  puterTokenUsed = token
  return puterInstance
}

function puterFriendlyError(e: unknown): string {
  // The SDK mostly rejects with plain objects like
  // { error: { code, message } }, { error: 'text', message, code } or an Error.
  // Unwrap before stringifying; `error` may be a string.
  const anyE = e as any
  const raw =
    e instanceof Error
      ? e.message
      : typeof anyE?.error === 'string'
        ? anyE.error
        : anyE?.error?.message ??
          anyE?.message ??
          anyE?.error ??
          anyE?.code ??
          (typeof e === 'string' ? e : JSON.stringify(e ?? ''))
  const msg = String(raw ?? '')
  const lower = msg.toLowerCase()
  if (lower.includes('unauthorized') || lower.includes('token_auth_failed')) {
    return 'Puter rejected the token — run `npm run puter-token` again and update PUTER_AUTH_TOKEN in .env.local, then restart the server.'
  }
  if (lower.includes('insufficient')) {
    return msg.length > 0 && msg.length < 220
      ? `Puter free monthly allowance is too low for that request: ${msg}`
      : 'Puter free monthly allowance is used up — it resets monthly, or top up at puter.com.'
  }
  if (lower.includes('too_many_requests') || lower.includes('rate limit')) {
    return 'Puter rate-limited the request — wait a minute and try again.'
  }
  if (lower.includes('reauth_required')) {
    return 'Puter token expired — re-run `npm run puter-token` and update PUTER_AUTH_TOKEN in .env.local.'
  }
  return msg || 'Puter request failed.'
}

export async function listModels(provider: string, opts: Partial<ChatRequest> = {}): Promise<ModelListResult> {
  if (provider === 'openrouter') {
    const key = opts.openrouterKey || process.env.OPENROUTER_API_KEY || ''
    if (!key) {
      return {
        models: STATIC_MODELS.openrouter,
        note: 'Free models shown. Add your (free) OpenRouter key in Settings to load the full live list.',
      }
    }
    try {
      const data = await fetchJson('https://openrouter.ai/api/v1/models', {
        headers: { Authorization: `Bearer ${key}` },
      })
      const models: ModelChoice[] = (data.data || [])
        .filter((m: any) => typeof m.id === 'string')
        .map((m: any) => ({
          id: m.id,
          name: m.name || m.id,
          provider: 'openrouter',
          free: m.id.includes(':free'),
        }))
        .sort((a: ModelChoice, b: ModelChoice) => Number(b.free) - Number(a.free))
      return { models }
    } catch (e) {
      return { models: STATIC_MODELS.openrouter, note: friendlyError(e, 'Could not load OpenRouter models.') }
    }
  }

  if (provider === 'xkiro') {
    const key = opts.xkiroKey || process.env.XKIRO_API_KEY || ''
    if (!key) {
      return {
        models: STATIC_MODELS.xkiro,
        note: 'Free xkiro models shown. Add your xkiro key in Settings to load the full live list.',
      }
    }
    try {
      const data = await fetchJson('https://api.xkiro.com/v1/models', {
        headers: { Authorization: `Bearer ${key}` },
      })
      const models: ModelChoice[] = (data.data || [])
        .filter((m: any) => typeof m.id === 'string')
        .map((m: any) => ({
          id: m.id,
          name: m.display_name || m.name || m.id,
          provider: 'xkiro',
          free: m.id.includes(':free') || m.access_tier === 'free',
        }))
        .sort((a: ModelChoice, b: ModelChoice) => Number(b.free) - Number(a.free))
      return { models }
    } catch (e) {
      return { models: STATIC_MODELS.xkiro, note: friendlyError(e, 'Could not load xkiro models.') }
    }
  }

  if (provider === 'gemini') {
    const key = opts.geminiKey || process.env.GEMINI_API_KEY || ''
    if (!key) {
      return {
        models: STATIC_MODELS.gemini,
        note: 'Free-tier models shown. Add your Gemini API key in Settings to load the full live list.',
      }
    }
    try {
      const data = await fetchJson(`https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(key)}`)
      const models: ModelChoice[] = (data.models || [])
        .filter((m: any) => m.supportedGenerationMethods?.includes('generateContent'))
        .map((m: any) => ({ id: m.name.replace(/^models\//, ''), name: m.displayName || m.name, provider: 'gemini', free: true }))
      return { models }
    } catch (e) {
      return { models: STATIC_MODELS.gemini, note: friendlyError(e, 'Could not load Gemini models.') }
    }
  }

  if (provider === 'puter') {
    const token = process.env.PUTER_AUTH_TOKEN || ''
    if (!token) {
      return {
        models: STATIC_MODELS.puter,
        note: 'Free models shown. Set PUTER_AUTH_TOKEN (one-time mint: `npm run puter-token`) to load all 1000+ Puter models.',
      }
    }
    try {
      const puter = await getPuter()
      const data: any[] = await puter.ai.listModels('gemini')
      const models: ModelChoice[] = (Array.isArray(data) ? data : [])
        .filter((m: any) => m && typeof (m.id ?? m.model) === 'string')
        .map((m: any) => ({
          id: m.id ?? m.model,
          name: m.name || m.id || m.model,
          provider: 'puter',
          free: true,
        }))
      let note = 'Live Puter models — free monthly allowance (≈1000 credits ≈ $1/month): chat ≈ $0, images/video draw credits.'
      try {
        const usage: any = await puter.auth.getMonthlyUsage()
        const rem = usage?.allowanceInfo?.remaining
        if (typeof rem === 'number' && rem > 0) {
          // Puter allowance units: 1000 ≈ $1 (banana ≈ 350, GPT Image 2 ≈ 30).
          const usd = rem < 1_000_000 ? rem / 1000 : rem
          note = `Puter free allowance left: $${usd.toFixed(2)} this month. Image costs vary — Nano Banana ≈ $0.35, GPT Image 2 much less (auto-fallback when allowance is low).`
        }
      } catch {
        // allowance lookup is best-effort
      }
      return { models: models.length ? models : STATIC_MODELS.puter, note }
    } catch (e) {
      return { models: STATIC_MODELS.puter, note: puterFriendlyError(e) }
    }
  }

  return { models: STATIC_MODELS[provider] || [], note: 'Unknown provider.' }
}

function toGeminiContents(messages: ChatMessage[]): { contents: any[]; system?: string } {
  const system = messages.find((m) => m.role === 'system')?.content
  const contents = messages
    .filter((m) => m.role !== 'system')
    .map((m) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }))
  return { contents, system }
}

export async function chat(opts: ChatRequest): Promise<string> {
  const { provider, messages, openrouterKey, geminiKey, xkiroKey, opencodeKey } = opts
  // "auto" / empty model names resolve to the provider's default model.
  const model = resolveChatModel(provider, opts.model)

  if (provider === 'openrouter') {
    const key = openrouterKey || process.env.OPENROUTER_API_KEY || ''
    if (!key) throw new Error('OpenRouter needs an API key. Get a free one at https://openrouter.ai/keys and add it in Settings.')
    try {
      const data = await fetchJson('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ model, messages }),
      })
      const reply = data?.choices?.[0]?.message?.content
      if (!reply) throw new Error('OpenRouter returned an empty reply.')
      return reply
    } catch (e) {
      if (e instanceof Error && e.message.toLowerCase().includes('no free')) {
        throw new Error('The selected free model is currently rate-limited on OpenRouter. Try another free model.')
      }
      throw e
    }
  }

  if (provider === 'xkiro') {
    const key = xkiroKey || process.env.XKIRO_API_KEY || ''
    if (!key) throw new Error('xkiro needs an API key. Add it in Settings → xkiro.')
    try {
      const data = await fetchJson('https://api.xkiro.com/v1/chat/completions', {
        method: 'POST',
        headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ model, messages }),
      })
      const reply = data?.choices?.[0]?.message?.content
      if (!reply) throw new Error('xkiro returned an empty reply.')
      return reply
    } catch (e) {
      throw e
    }
  }

  if (provider === 'opencode') {
    const key = opencodeKey || process.env.OPENCODE_API_KEY || ''
    if (!key) throw new Error('OpenCode needs an API key. Get a free one at https://opencode.ai and add it in Settings.')
    try {
      const data = await fetchJson('https://opencode.ai/zen/v1/chat/completions', {
        method: 'POST',
        headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ model, messages }),
      })
      const reply = data?.choices?.[0]?.message?.content
      if (!reply) throw new Error('OpenCode returned an empty reply.')
      return reply
    } catch (e) {
      if (e instanceof Error && e.message.includes('can only be used from within OpenCode')) {
        throw new Error('That OpenCode model is restricted to the OpenCode app — use space-bunny-free here.')
      }
      throw e
    }
  }

  if (provider === 'gemini') {
    const key = geminiKey || process.env.GEMINI_API_KEY || ''
    if (!key) throw new Error('Gemini needs an API key. Get a free one at https://aistudio.google.com/apikey and add it in Settings.')
    const { contents, system } = toGeminiContents(messages)
    const body: any = { contents }
    if (system) body.systemInstruction = { parts: [{ text: system }] }
    try {
      const data = await fetchJson(
        `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(key)}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        },
      )
      const reply = data?.candidates?.[0]?.content?.parts?.map((p: any) => p.text).join('')
      if (!reply) throw new Error('Gemini returned an empty reply.')
      return reply
    } catch (e) {
      throw e
    }
  }

  if (provider === 'puter') {
    try {
      const puter = await getPuter()
      const response = await puter.ai.chat(messages, { model, normalize: true })
      const reply = response?.message?.content
      if (!reply) throw new Error('Puter returned an empty reply.')
      return typeof reply === 'string' ? reply : JSON.stringify(reply)
    } catch (e) {
      if (e instanceof Error && e.message.includes('Puter returned an empty reply')) throw e
      throw new Error(puterFriendlyError(e))
    }
  }

  throw new Error(`Unknown provider: ${provider}`)
}

export interface AnalyzeImageOpts {
  provider: string
  model: string
  imageDataUrl: string // data:image/...;base64,...
  prompt?: string
  openrouterKey?: string
  geminiKey?: string
}

export interface AnalyzeImageResult {
  result: string
  /** The model that actually analyzed the image (after auto-switch). */
  model: string
  /** True when the selected model couldn't see images and we swapped. */
  autoSwitched: boolean
}

export async function analyzeImage(opts: AnalyzeImageOpts): Promise<AnalyzeImageResult> {
  const { provider, imageDataUrl, openrouterKey, geminiKey } = opts
  const prompt = opts.prompt?.trim() || 'Describe this image in detail.'
  const b64 = imageDataUrl.split(',')[1] || ''
  if (!b64) throw new Error('Invalid image data URL.')

  // Auto-detect a vision-capable model: keep the user's model when it can see
  // images, otherwise switch to the provider's vision default.
  const { model, autoSwitched } = resolveVisionModel(provider, opts.model)

  if (provider === 'opencode') {
    throw new Error('OpenCode (space-bunny-free) is chat-only. Switch to Gemini or OpenRouter to analyze images.')
  }

  if (provider === 'openrouter') {
    const key = openrouterKey || process.env.OPENROUTER_API_KEY || ''
    if (!key) throw new Error('OpenRouter needs an API key. Get a free one at https://openrouter.ai/keys and add it in Settings.')
    try {
      const data = await fetchJson('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model,
          messages: [
            {
              role: 'user',
              content: [
                { type: 'text', text: prompt },
                { type: 'image_url', image_url: { url: imageDataUrl } },
              ],
            },
          ],
        }),
      })
      const reply = data?.choices?.[0]?.message?.content
      if (!reply) throw new Error('OpenRouter returned an empty reply.')
      return { result: reply, model, autoSwitched }
    } catch (e) {
      if (e instanceof Error && e.message.toLowerCase().includes('no free')) {
        throw new Error('The selected free model is currently rate-limited on OpenRouter. Try another free model.')
      }
      throw e
    }
  }

  if (provider === 'gemini') {
    const key = geminiKey || process.env.GEMINI_API_KEY || ''
    if (!key) throw new Error('Gemini needs an API key. Get a free one at https://aistudio.google.com/apikey and add it in Settings.')
    const match = imageDataUrl.match(/^data:([^;]+);base64,(.+)$/)
    if (!match) throw new Error('Invalid image data URL.')
    const mime = match[1]
    const raw = match[2]
    try {
      const data = await fetchJson(
        `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(key)}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [
              {
                role: 'user',
                parts: [{ text: prompt }, { inline_data: { mime_type: mime, data: raw } }],
              },
            ],
          }),
        },
      )
      const reply = data?.candidates?.[0]?.content?.parts?.map((p: any) => p.text).join('')
      if (!reply) throw new Error('Gemini returned an empty reply.')
      return { result: reply, model, autoSwitched }
    } catch (e) {
      throw e
    }
  }

  if (provider === 'puter') {
    // Image analysis through Puter's chat(prompt, media, options) form.
    try {
      const puter = await getPuter()
      const response = await puter.ai.chat(prompt, imageDataUrl, { model, normalize: true })
      const reply = response?.message?.content
      if (!reply) throw new Error('Puter returned an empty reply.')
      return { result: typeof reply === 'string' ? reply : JSON.stringify(reply), model, autoSwitched }
    } catch (e) {
      throw new Error(puterFriendlyError(e))
    }
  }

  throw new Error(`Unknown provider: ${provider}`)
}

export interface GenerateGeminiImageOpts {
  prompt: string
  model?: string
  aspectRatio?: string
  geminiKey?: string
}

// Free-tier note: as of 2026, Gemini's image models (Nano Banana family) have a
// 0-images/day rate limit on Free Tier keys — the API returns a clear
// "Rate limit exceeded ... (limit: 0 requests per day)" error. This path is
// correct and works on keys with image quota (paid tier).
export async function generateGeminiImage(opts: GenerateGeminiImageOpts): Promise<{ data: Buffer; mimeType: string }> {
  const key = opts.geminiKey || process.env.GEMINI_API_KEY || ''
  if (!key) {
    throw new Error('Gemini needs an API key. Get a free one at https://aistudio.google.com/apikey and add it in Settings.')
  }
  const model = opts.model || 'gemini-3.1-flash-image'
  try {
    const data = await fetchJson('https://generativelanguage.googleapis.com/v1beta/interactions', {
      method: 'POST',
      headers: { 'x-goog-api-key': key, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        input: [{ type: 'text', text: opts.prompt.slice(0, 4000) }],
        response_format: {
          type: 'image',
          ...(opts.aspectRatio ? { aspect_ratio: opts.aspectRatio } : {}),
        },
      }),
    })
    // REST Interaction → steps[] → model_output → content[ { type:'image', data, mime_type } ]
    const steps: any[] = Array.isArray(data?.steps) ? data.steps : []
    let img: { data?: string; mime_type?: string } | null = null
    for (const s of steps) {
      if (s?.type !== 'model_output') continue
      for (const block of s?.content ?? []) {
        if (block?.type === 'image' && block?.data) {
          img = block
          break
        }
      }
      if (img) break
    }
    // Fallback for legacy shape (candidates[].content.parts[].inlineData)
    if (!img) {
      const parts = data?.candidates?.[0]?.content?.parts ?? []
      const inline = parts.find((p: any) => p?.inlineData?.data)?.inlineData
      if (inline?.data) img = inline
    }
    if (!img?.data) {
      throw new Error('Gemini returned no image. Try a different prompt or model.')
    }
    return {
      data: Buffer.from(img.data, 'base64'),
      mimeType: img.mime_type || 'image/png',
    }
  } catch (e) {
    throw new Error(friendlyError(e, 'Gemini image generation failed.'))
  }
}

export interface GeneratePuterImageOpts {
  prompt: string
  model?: string
  aspectRatio?: string
}

// Puter image generation via puter.ai.txt2img (Node resolves to { src }).
// Model costs vary a lot against the free monthly allowance (Nano Banana
// ≈ $0.35/image, GPT Image 2 a small fraction of that), so when the chosen
// model is declined for insufficient allowance we auto-retry once with the
// cheapest option that still fits the balance — the UI shows which model
// actually rendered via the `model` field of the result.
export async function generatePuterImage(opts: GeneratePuterImageOpts): Promise<{
  data: Buffer
  mimeType: string
  model: string
}> {
  const requested = opts.model || 'gemini-3.1-flash-image'
  const attempts = requested === 'gpt-image-2' ? [requested] : [requested, 'gpt-image-2']
  let lastErr = ''
  const ratio = opts.aspectRatio?.split(':')
  const optionsFor = (model: string): Record<string, unknown> => {
    const options: Record<string, unknown> = { model }
    if (ratio?.length === 2) {
      options.ratio = { w: Number(ratio[0]), h: Number(ratio[1]) }
    }
    return options
  }
  for (const model of attempts) {
    try {
      const puter = await getPuter()
      const image: any = await puter.ai.txt2img(opts.prompt.slice(0, 4000), optionsFor(model))
      const src = image?.src || image?.url || (typeof image === 'string' ? image : '')
      if (!src) {
        throw new Error('Puter returned no image. Try a different prompt or model.')
      }
      const { data, mimeType } = await imgSrcToBuffer(src)
      return { data, mimeType, model }
    } catch (e) {
      lastErr = puterFriendlyError(e)
      if (!/insufficient/i.test(lastErr)) throw new Error(lastErr)
      // allowance too low for this model → try the cheaper one next
    }
  }
  throw new Error(lastErr || 'Puter image generation failed.')
}

export interface GenerateXkiroImageOpts {
  prompt: string
  model?: string
  width: number
  height: number
  xkiroKey?: string
}

// SenseNova image generation via xkiro's OpenAI-compatible API. Submission is
// async: POST /v1/images/generations returns a job id (HTTP 202), which we poll
// (GET /v1/images/generations/{id}) until it succeeds, then fetch the image
// bytes from the returned CDN url. Verified live: model
// "sensenova/sensenova-u1.5-lite", response data[0].url → PNG.
export async function generateXkiroImage(opts: GenerateXkiroImageOpts): Promise<{
  data: Buffer
  mimeType: string
}> {
  const key = opts.xkiroKey || process.env.XKIRO_API_KEY || ''
  if (!key) throw new Error('xkiro needs an API key. Add it in Settings → xkiro.')
  const model = opts.model || 'sensenova/sensenova-u1.5-lite'
  try {
    const created = await fetchJson('https://api.xkiro.com/v1/images/generations', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        prompt: opts.prompt.slice(0, 4000),
        size: `${opts.width}x${opts.height}`,
        n: 1,
      }),
    })
    const jobId = created?.id
    if (!jobId) throw new Error('xkiro did not return an image job id.')
    const deadline = Date.now() + 90_000
    const terminal = ['succeeded', 'completed', 'failed']
    let job: any = created
    // Keep polling on any non-terminal status (processing / queued / unknown
    // intermediate states) so transient statuses never abort the wait.
    while (!terminal.includes(job?.status)) {
      if (Date.now() > deadline) throw new Error('Timed out waiting for the xkiro image. Try again in a moment.')
      await new Promise((r) => setTimeout(r, 2500))
      job = await fetchJson(`https://api.xkiro.com/v1/images/generations/${encodeURIComponent(jobId)}`, {
        headers: { Authorization: `Bearer ${key}` },
      })
    }
    if (job?.status === 'failed') {
      throw new Error(job?.error?.message || 'xkiro image generation failed.')
    }
    const url = job?.data?.[0]?.url
    if (!url) throw new Error('xkiro completed but returned no image URL.')
    // The CDN link is freshly signed — retry once if the first fetch flakes.
    let resp = await fetch(url, { signal: AbortSignal.timeout(60_000) })
    if (!resp.ok) {
      await new Promise((r) => setTimeout(r, 2000))
      resp = await fetch(url, { signal: AbortSignal.timeout(60_000) })
    }
    if (!resp.ok) throw new Error(`Could not download the generated image (HTTP ${resp.status}).`)
    const mimeType = resp.headers.get('content-type') || 'image/png'
    return { data: Buffer.from(await resp.arrayBuffer()), mimeType }
  } catch (e) {
    throw new Error(friendlyError(e, 'xkiro image generation failed.'))
  }
}

export interface GeneratePuterVideoOpts {
  prompt: string
  model?: string
  /** Clip length in seconds (model default when omitted). */
  seconds?: number
  /** test_mode — free sample clip; still validates the model id. */
  testMode?: boolean
}

// Puter animated output via puter.ai.txt2vid (Node resolves to an object with
// .src). Model ids below were verified live against this account (Veo 3.1 /
// Seedance). Real runs spend a small slice of the free monthly allowance;
// `testMode: true` returns a sample clip free of charge and validates the id.
export async function generatePuterVideo(opts: GeneratePuterVideoOpts): Promise<{ data: Buffer; mimeType: string }> {
  const model = opts.model || 'veo-3.1-lite'
  try {
    const puter = await getPuter()
    const options: Record<string, unknown> = { model }
    if (opts.seconds && opts.seconds > 0) options.seconds = opts.seconds
    if (opts.testMode) options.test_mode = true
    const video: any = await puter.ai.txt2vid(opts.prompt.slice(0, 4000), options)
    const src = video?.src || video?.url || (typeof video === 'string' ? video : '')
    if (!src) {
      throw new Error('Puter returned no video. Try a different prompt or model.')
    }
    return await srcToBuffer(src, 'video/mp4', 240000)
  } catch (e) {
    throw new Error(puterFriendlyError(e))
  }
}

async function srcToBuffer(src: string, mimeFallback: string, timeoutMs: number): Promise<{ data: Buffer; mimeType: string }> {
  if (src.startsWith('data:')) {
    const m = src.match(/^data:([^;,]+)[^,]*,(.*)$/s)
    return {
      data: Buffer.from(m ? m[2] : src.split(',')[1] || '', 'base64'),
      mimeType: m ? m[1] : mimeFallback,
    }
  }
  const resp = await fetch(src, { signal: AbortSignal.timeout(timeoutMs) })
  if (!resp.ok) throw new Error(`Puter media fetch returned HTTP ${resp.status}`)
  return {
    data: Buffer.from(await resp.arrayBuffer()),
    mimeType: resp.headers.get('content-type') || mimeFallback,
  }
}

async function imgSrcToBuffer(src: string): Promise<{ data: Buffer; mimeType: string }> {
  return srcToBuffer(src, 'image/png', 120000)
}

// SenseNova's image endpoint only accepts a fixed set of 7 pixel resolutions —
// anything else (e.g. an arbitrary 16:9 → 1280x720) returns HTTP 400
// "Unsupported size". Snap the requested width×height to the nearest supported
// SenseNova size instead of failing the whole generation. Exact matches (and
// 1:1) pass through unchanged; other aspects keep their original orientation
// (landscape stays landscape, portrait stays portrait).
export function snapToSenseNovaSize(width: number, height: number): [number, number] {
  const sizes: [number, number][] = [
    [256, 256],
    [512, 512],
    [1024, 1024],
    [1024, 1792],
    [1792, 1024],
    [1024, 1536],
    [1536, 1024],
    [768, 1536],
    [1536, 768],
  ]
  const w = Math.max(64, Math.min(1600, Number(width) || 1024))
  const h = Math.max(64, Math.min(1600, Number(height) || 1024))
  let best = sizes[0]
  let bestScore = Infinity
  for (const [sw, sh] of sizes) {
    // Chebyshev-ish distance on both dimensions; prefers same-orientation
    // candidates so 3:2 doesn't collapse to 2:3.
    const d = Math.max(Math.abs(sw - w), Math.abs(sh - h))
    if (d < bestScore) {
      bestScore = d
      best = [sw, sh]
    }
  }
  return best
}