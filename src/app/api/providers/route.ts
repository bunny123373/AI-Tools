import { NextResponse } from 'next/server'
import { PROVIDERS } from '@/providers'

export const dynamic = 'force-dynamic'

export async function GET() {
  return NextResponse.json(PROVIDERS)
}