import { NextResponse } from 'next/server'
import type { ChatMessage } from '@/types'
import { chat } from '@/providers'
import { unfurlUrl } from '@/lib/unfurl'

export const dynamic = 'force-dynamic'

type Detail = 'brief' | 'standard' | 'detailed'

/** Structure + word-cap per requested summary length. */
const PLANS: Record<Detail, { structure: string; cap: string }> = {
  brief: {
    structure: '1. TL;DR — one sentence\n2. Key points — up to 3 short bullets',
    cap: '120 words',
  },
  standard: {
    structure:
      '1. TL;DR — one or two sentences\n2. Key points — 4-6 bullets\n3. Takeaway — one sentence on why it matters',
    cap: '300 words',
  },
  detailed: {
    structure:
      '1. TL;DR — two sentences\n2. Key points — 6-10 bullets\n3. Takeaway — one sentence on why it matters\n4. Notable quotes or statistics — only if present in the article',
    cap: '600 words',
  },
}

/** Article → AI summary: read the page server-side, summarize with the chosen provider. */
export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>
  const url = String(body.url || '').trim()
  if (!url) return NextResponse.json({ error: 'Missing "url".' }, { status: 400 })
  const detail: Detail = ['brief', 'standard', 'detailed'].includes(String(body.detail))
    ? (String(body.detail) as Detail)
    : 'standard'
  try {
    const meta = await unfurlUrl(url)
    if (!meta.text) {
      return NextResponse.json(
        { error: 'No readable text found on that page — it may block automatic fetches.' },
        { status: 422 },
      )
    }
    const plan = PLANS[detail]
    const prompt = `Summarize the article below. Use this structure:
${plan.structure}

TITLE: ${meta.title}
${meta.description ? `DESCRIPTION: ${meta.description}\n` : ''}
SOURCE: ${meta.siteName}

ARTICLE:
${meta.text}`
    const messages: ChatMessage[] = [
      {
        role: 'system',
        content: `You are a precise summarizer. Stay faithful to the article, do not invent facts, and keep the response under ${plan.cap}.`,
      },
      { role: 'user', content: prompt },
    ]
    const result = await chat({
      provider: (body.provider as string) || 'ollama',
      model: (body.model as string) || '',
      messages,
      openrouterKey: body.openrouterKey ? String(body.openrouterKey) : undefined,
      geminiKey: body.geminiKey ? String(body.geminiKey) : undefined,
      xkiroKey: body.xkiroKey ? String(body.xkiroKey) : undefined,
      opencodeKey: body.opencodeKey ? String(body.opencodeKey) : undefined,
      ollamaBaseUrl: body.ollamaBaseUrl ? String(body.ollamaBaseUrl) : undefined,
    })
    const { text: _text, ...preview } = meta
    return NextResponse.json({ result, meta: preview })
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Could not summarize the page.' },
      { status: 502 },
    )
  }
}