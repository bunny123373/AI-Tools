import { NextResponse } from 'next/server'
import { PROVIDERS } from '@/providers'

export const dynamic = 'force-dynamic'

export async function GET() {
  return NextResponse.json({ ok: true, providers: PROVIDERS.map((p) => p.id) })
}