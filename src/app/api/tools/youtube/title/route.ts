import { NextResponse } from 'next/server'
import type { ChatMessage } from '@/types'
import { chat } from '@/providers'
import { fetchYouTubeInfo } from '@/lib/youtube'

export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>
  const url = String(body.url || '').trim()
  const goals = String(body.goals || '').trim()
  if (!url) return NextResponse.json({ error: 'Missing "url".' }, { status: 400 })
  try {
    const info = await fetchYouTubeInfo(url)
    const prompt = `Create a complete YouTube video package for the video "${info.title}"${
      info.author ? ` by ${info.author}` : ''
    }.${goals ? ` Creator goals/notes: ${goals}.` : ''}

Return exactly four sections:
1. TITLES — 5 click-worthy titles, each under 55 characters
2. DESCRIPTION — one friendly intro paragraph plus bullet points of what the viewer learns (~150 words max)
3. TAGS — 10 keywords separated by commas
4. HASHTAGS — 5 hashtags`
    const messages: ChatMessage[] = [
      {
        role: 'system',
        content:
          'You are a YouTube SEO and content expert. Return clean, production-ready text with the four labeled sections. Keep the language of the video title unless the user asks otherwise.',
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
      ollamaBaseUrl: body.ollamaBaseUrl ? String(body.ollamaBaseUrl) : undefined,
    })
    return NextResponse.json({ result, info })
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'AI request failed.' },
      { status: 502 },
    )
  }
}