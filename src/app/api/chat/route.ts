import { NextResponse } from 'next/server'
import type { ChatMessage, ChatRequest, SearchSource } from '@/types'
import { chat } from '@/providers'

export const dynamic = 'force-dynamic'

const TAVILY_URL = 'https://api.tavily.com/search'

function parseChatBody(body: unknown): ChatRequest {
  if (!body || typeof body !== 'object') throw new Error('Invalid request body.')
  const b = body as Record<string, unknown>
  const provider = String(b.provider || 'ollama')
  const messages: ChatMessage[] = Array.isArray(b.messages) ? (b.messages as ChatMessage[]) : []
  if (!messages.length) throw new Error('No messages provided.')
  for (const m of messages) {
    if (!m || typeof m.content !== 'string' || !['user', 'assistant', 'system'].includes(m.role)) {
      throw new Error('Invalid message: each message needs a role and a content string.')
    }
  }
  return {
    provider,
    model: b.model ? String(b.model) : '',
    messages,
    web: b.web === true,
    openrouterKey: b.openrouterKey ? String(b.openrouterKey) : undefined,
    geminiKey: b.geminiKey ? String(b.geminiKey) : undefined,
    xkiroKey: b.xkiroKey ? String(b.xkiroKey) : undefined,
    webSearchKey: b.webSearchKey ? String(b.webSearchKey) : undefined,
    ollamaBaseUrl: b.ollamaBaseUrl ? String(b.ollamaBaseUrl) : undefined,
  }
}

// Best-effort live web search via Tavily (free tier ≈ 1,000 credits/month).
// Never throws — a failed search simply sends the chat through unchanged.
async function tavilySearch(query: string, apiKey: string): Promise<SearchSource[]> {
  try {
    const res = await fetch(TAVILY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ api_key: apiKey, query, max_results: 5, include_answer: false }),
      signal: AbortSignal.timeout(12000),
    })
    if (!res.ok) return []
    const data = await res.json()
    const results = Array.isArray(data?.results)
      ? (data.results as Array<{ title?: string; url?: string; content?: string }>)
      : []
    return results.map((r) => ({
      title: String(r.title ?? 'Untitled'),
      url: String(r.url ?? ''),
      snippet: String(r.content ?? '').slice(0, 300),
    }))
  } catch {
    return []
  }
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null)
  let opts: ChatRequest
  try {
    opts = parseChatBody(body)
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Invalid request.' },
      { status: 400 },
    )
  }
  try {
    let sources: SearchSource[] = []
    if (opts.web && opts.webSearchKey) {
      const last = [...opts.messages].reverse().find((m) => m.role === 'user')
      if (last) sources = await tavilySearch(last.content.slice(0, 400), opts.webSearchKey)
    }
    if (sources.length) {
      const ctx = sources.map((s, i) => `[${i + 1}] ${s.title}\n${s.url}\n${s.snippet}`).join('\n\n')
      opts.messages = [
        ...opts.messages,
        {
          role: 'system',
          content:
            "Use these live web search results to answer the user's latest question. Cite the source number like [1] when they back up your answer. The results may be outdated.\n\n" +
            ctx,
        },
      ]
    }
    const reply = await chat(opts)
    return NextResponse.json({ reply, sources })
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'AI request failed.' },
      { status: 502 },
    )
  }
}