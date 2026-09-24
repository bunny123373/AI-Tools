import { NextResponse } from 'next/server'
import { analyzeImage } from '@/providers'

export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  const body = ((await req.json().catch(() => null)) ?? {}) as Record<string, unknown>
  const imageDataUrl = typeof body.imageDataUrl === 'string' ? body.imageDataUrl : ''
  if (!imageDataUrl) {
    return NextResponse.json({ error: 'Missing image data. Upload an image first.' }, { status: 400 })
  }
  if (!/^data:image\/[a-z+.-]+;base64,/i.test(imageDataUrl)) {
    return NextResponse.json(
      { error: 'Invalid image data. Please upload a PNG, JPG, WebP or GIF image.' },
      { status: 400 },
    )
  }
  try {
    const result = await analyzeImage({
      provider: (body.provider as string) || 'ollama',
      model: (body.model as string) || '',
      imageDataUrl,
      prompt: body.prompt ? String(body.prompt) : undefined,
      openrouterKey: body.openrouterKey ? String(body.openrouterKey) : undefined,
      geminiKey: body.geminiKey ? String(body.geminiKey) : undefined,
      ollamaBaseUrl: body.ollamaBaseUrl ? String(body.ollamaBaseUrl) : undefined,
    })
    return NextResponse.json({ result })
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Image analysis failed.' },
      { status: 502 },
    )
  }
}