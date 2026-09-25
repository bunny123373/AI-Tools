import { NextResponse } from 'next/server'
import type { ChatMessage } from '@/types'
import { chat } from '@/providers'

export const dynamic = 'force-dynamic'

const SYSTEM_PROMPTS: Record<string, string> = {
  summarize:
    'You are a concise summarizer. Summarize the given text into a clear, short summary of no more than 150 words. Use bullet points if it helps. Return only the summary.',
  proofread:
    'You are a careful proofreader. Fix all grammar, spelling, punctuation and style issues in the given text. Return ONLY the corrected text. If it is already correct, return it unchanged.',
}

const STYLE_GUIDE: Record<string, string> = {
  professional: 'formal, clear, and professional',
  friendly: 'warm, approachable, and natural',
  concise: 'short, punchy, and to the point',
  casual: 'relaxed and conversational',
  formal: 'highly formal and polished',
}

function systemPromptFor(kind: string, body: Record<string, unknown>): string | null {
  if (kind === 'improve') {
    const style = String(body.style || 'professional')
    const guide = STYLE_GUIDE[style] || STYLE_GUIDE.professional
    return `You are an expert editor. Rewrite the given text to be ${guide} while keeping the original meaning and tone of the author. Return only the improved text.`
  }
  if (kind === 'translate') {
    const language = String(body.language || 'English').trim()
    if (/auto/i.test(language)) {
      return 'You are a professional translator. Detect the source language of the given text automatically. If it is not English, translate it into natural English. If it is already English, keep the meaning and polish the wording. Return only the translated text.'
    }
    return `You are a professional translator. Translate the given text into ${language}. Keep the tone natural and accurate. Return only the translation in ${language}.`
  }
  return SYSTEM_PROMPTS[kind] ?? null
}

export async function POST(req: Request, { params }: { params: Promise<{ kind: string }> }) {
  const { kind } = await params
  const systemPrompt = systemPromptFor(kind, {})
  if (!systemPrompt) {
    return NextResponse.json({ error: 'Not found.' }, { status: 404 })
  }

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>
  if (!body || typeof body.text !== 'string' || !body.text) {
    return NextResponse.json({ error: 'Missing "text" field.' }, { status: 400 })
  }

  // Rebuild the prompt with the actual body (style / language options).
  const prompt = systemPromptFor(kind, body) ?? systemPrompt
  const messages: ChatMessage[] = [
    { role: 'system', content: prompt },
    { role: 'user', content: String(body.text) },
  ]
  try {
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
    return NextResponse.json({ result })
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'AI request failed.' },
      { status: 502 },
    )
  }
}