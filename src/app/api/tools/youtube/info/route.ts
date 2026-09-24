import { NextResponse } from 'next/server'
import { fetchYouTubeInfo } from '@/lib/youtube'

export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>
  const url = String(body.url || '').trim()
  if (!url) return NextResponse.json({ error: 'Missing "url".' }, { status: 400 })
  try {
    const info = await fetchYouTubeInfo(url)
    return NextResponse.json(info)
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Could not fetch the video.' },
      { status: 502 },
    )
  }
}