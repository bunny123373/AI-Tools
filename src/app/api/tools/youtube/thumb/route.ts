import { NextResponse } from 'next/server'
import { getVideoId } from '@/lib/youtube'

export const dynamic = 'force-dynamic'

/** Proxies the hqdefault thumbnail so clients can save it without CORS issues. */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const id = getVideoId(searchParams.get('url') || '')
  if (!id) return NextResponse.json({ error: 'Bad URL.' }, { status: 400 })
  try {
    const res = await fetch(`https://i.ytimg.com/vi/${id}/hqdefault.jpg`, {
      signal: AbortSignal.timeout(12000),
    })
    if (!res.ok) return NextResponse.json({ error: 'Thumbnail not found.' }, { status: 404 })
    const buf = Buffer.from(await res.arrayBuffer())
    return new NextResponse(new Uint8Array(buf), {
      headers: {
        'Content-Type': 'image/jpeg',
        'Cache-Control': 'public, max-age=86400',
      },
    })
  } catch {
    return NextResponse.json({ error: 'Thumbnail fetch failed.' }, { status: 502 })
  }
}