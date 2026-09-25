import { NextResponse } from 'next/server'
import { generateGeminiImage, generatePuterImage, generateXkiroImage, snapToSenseNovaSize } from '@/providers'

export const dynamic = 'force-dynamic'

// Image generation endpoint.
// - provider === 'gemini'  → Gemini's native image models (Nano Banana family)
//   via the current Interactions API, using the user's key or the server-side
//   GEMINI_API_KEY fallback. Errors (e.g. free-tier "limit: 0 requests per
//   day") are returned as JSON so the UI can show them.
// - provider === 'xkiro'   → SenseNova image models via xkiro's OpenAI-style
//   async endpoint (submit job → poll → download PNG), using the user's key
//   or the server-side XKIRO_API_KEY fallback.
// - provider === 'puter'   → Puter's txt2img (free monthly allowance).
// - anything else → proxies Pollinations.ai (free, no key) because the browser
//   can't call it directly with a localhost Origin header (HTTP 403). The
//   bytes stream straight back so the image can be shown and downloaded.
export async function POST(req: Request) {
  const body = ((await req.json().catch(() => null)) ?? {}) as Record<string, unknown>
  const prompt = typeof body.prompt === 'string' ? body.prompt.trim() : ''
  if (!prompt) {
    return NextResponse.json({ error: 'Missing image prompt.' }, { status: 400 })
  }

  if (body.provider === 'gemini') {
    const width = Math.min(1600, Math.max(64, Number(body.width) || 1024))
    const height = Math.min(1600, Math.max(64, Number(body.height) || 1024))
    const aspect = ratioToAspect(width, height)
    try {
      const { data, mimeType } = await generateGeminiImage({
        prompt: prompt.slice(0, 4000),
        model: typeof body.model === 'string' && body.model ? body.model : undefined,
        aspectRatio: aspect,
        geminiKey: typeof body.geminiKey === 'string' && body.geminiKey ? body.geminiKey : undefined,
      })
      return new NextResponse(new Uint8Array(data), {
        status: 200,
        headers: {
          'Content-Type': mimeType || 'image/png',
          'Cache-Control': 'no-store',
        },
      })
    } catch (e) {
      return NextResponse.json(
        { error: e instanceof Error ? e.message : 'Gemini image generation failed.' },
        { status: 502 },
      )
    }
  }

  if (body.provider === 'puter') {
    const width = Math.min(1600, Math.max(64, Number(body.width) || 1024))
    const height = Math.min(1600, Math.max(64, Number(body.height) || 1024))
    const aspect = ratioToAspect(width, height)
    try {
      const { data, mimeType, model: usedModel } = await generatePuterImage({
        prompt: prompt.slice(0, 4000),
        model: typeof body.model === 'string' && body.model ? body.model : undefined,
        aspectRatio: aspect,
      })
      const headers: Record<string, string> = {
        'Content-Type': mimeType || 'image/png',
        'Cache-Control': 'no-store',
      }
      if (usedModel && usedModel !== body.model) {
        headers['X-Used-Model'] = usedModel
      }
      return new NextResponse(new Uint8Array(data), {
        status: 200,
        headers,
      })
    } catch (e) {
      return NextResponse.json(
        { error: e instanceof Error ? e.message : 'Puter image generation failed.' },
        { status: 502 },
      )
    }
  }

  if (body.provider === 'xkiro') {
    // SenseNova's image API only accepts a fixed set of pixel sizes — anything
    // else (e.g. an arbitrary 16:9 → 1280x720) gets HTTP 400 "Unsupported size".
    // Snap the requested aspect to the nearest supported resolution instead of
    // failing the whole generation.
    const [width, height] = snapToSenseNovaSize(Number(body.width) || 1024, Number(body.height) || 1024)
    try {
      const { data, mimeType } = await generateXkiroImage({
        prompt: prompt.slice(0, 4000),
        model: typeof body.model === 'string' && body.model ? body.model : undefined,
        width,
        height,
        xkiroKey: typeof body.xkiroKey === 'string' && body.xkiroKey ? body.xkiroKey : undefined,
      })
      return new NextResponse(new Uint8Array(data), {
        status: 200,
        headers: {
          'Content-Type': mimeType || 'image/png',
          'Cache-Control': 'no-store',
        },
      })
    } catch (e) {
      return NextResponse.json(
        { error: e instanceof Error ? e.message : 'xkiro image generation failed.' },
        { status: 502 },
      )
    }
  }
  const width = Math.min(1600, Math.max(64, Number(body.width) || 1024))
  const height = Math.min(1600, Math.max(64, Number(body.height) || 1024))
  const seed = Number(body.seed) || Math.floor(Math.random() * 1_000_000_000)
  const model = body.model === 'turbo' ? 'turbo' : 'flux'
  const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt.slice(0, 400))}?width=${width}&height=${height}&seed=${seed}&nologo=true&model=${model}`

  try {
    let resp = await fetch(url, { signal: AbortSignal.timeout(120000) })
    if (resp.status === 403 || resp.status === 429) {
      // The free service rate-limits aggressively; retry once.
      await new Promise((r) => setTimeout(r, 3000))
      resp = await fetch(url, { signal: AbortSignal.timeout(120000) })
    }
    if (!resp.ok) throw new Error(`Image service returned HTTP ${resp.status}`)
    const buf = Buffer.from(await resp.arrayBuffer())
    return new NextResponse(new Uint8Array(buf), {
      status: 200,
      headers: {
        'Content-Type': resp.headers.get('content-type') || 'image/jpeg',
        'Cache-Control': 'no-store',
        'X-Seed': String(seed),
      },
    })
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Image generation failed. The free service may be busy, try again in a moment.' },
      { status: 502 },
    )
  }
}

function ratioToAspect(w: number, h: number): string {
  const r = w / h
  const opts: [string, number][] = [
    ['1:1', 1],
    ['16:9', 16 / 9],
    ['9:16', 9 / 16],
    ['3:2', 1.5],
    ['2:3', 2 / 3],
    ['3:4', 3 / 4],
    ['4:3', 4 / 3],
    ['21:9', 21 / 9],
  ]
  let best = '1:1'
  let bestDiff = Infinity
  for (const [label, v] of opts) {
    const d = Math.abs(r - v)
    if (d < bestDiff) {
      bestDiff = d
      best = label
    }
  }
  return best
}