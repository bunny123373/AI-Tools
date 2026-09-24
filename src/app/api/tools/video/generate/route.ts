import { NextResponse } from 'next/server'
import { generatePuterVideo } from '@/providers'

export const dynamic = 'force-dynamic'

// Animated image output — Puter text-to-video (Veo 3.1 / Seedance …) via the
// same free monthly allowance as chat and image generation. The rendered clip
// (mp4) is streamed straight back so the UI can play and download it.
// - { prompt, model, seconds }  → real clip (spends a little allowance)
// - { testMode: true }          → free sample clip (also validates the model)
export async function POST(req: Request) {
  const body = ((await req.json().catch(() => null)) ?? {}) as Record<string, unknown>
  const prompt = typeof body.prompt === 'string' ? body.prompt.trim() : ''
  if (!prompt) {
    return NextResponse.json({ error: 'Missing video prompt.' }, { status: 400 })
  }

  try {
    const seconds = Math.min(10, Math.max(2, Number(body.seconds) || 4))
    const { data, mimeType } = await generatePuterVideo({
      prompt: prompt.slice(0, 4000),
      model: typeof body.model === 'string' && body.model ? body.model : undefined,
      seconds,
      testMode: body.testMode === true,
    })
    return new NextResponse(new Uint8Array(data), {
      status: 200,
      headers: {
        'Content-Type': mimeType || 'video/mp4',
        'Cache-Control': 'no-store',
        ...(body.testMode === true ? { 'X-Test-Mode': '1' } : {}),
      },
    })
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Video generation failed.' },
      { status: 502 },
    )
  }
}