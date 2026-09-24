import { NextRequest, NextResponse } from 'next/server'
import { listModels } from '@/providers'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const provider = String(req.nextUrl.searchParams.get('provider') || 'ollama')
  const xkiroKey = req.nextUrl.searchParams.get('key') || undefined
  try {
    return NextResponse.json(await listModels(provider, { xkiroKey }))
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Failed to list models.' },
      { status: 502 },
    )
  }
}