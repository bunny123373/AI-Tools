// Chat history API — get, update (upsert) and delete one conversation.
// Guest mode mirrors the list route: signed-out visitors use the guest_id
// cookie so their history stays scoped to their browser.
// Params are a Promise in Next.js 15/16 route handlers.
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { auth } from '@/auth'
import { deleteChatForUser, getChatForUser, saveChatForUser } from '@/lib/history'
import type { ChatMessage } from '@/types'

export const dynamic = 'force-dynamic'

async function currentUserId(): Promise<string | null> {
  const session = await auth()
  if (session?.user?.id) return session.user.id as string
  const store = await cookies()
  const gid = store.get('guest_id')?.value
  return gid ? `guest_${gid}` : null
}

function validMessages(raw: unknown): ChatMessage[] {
  if (!Array.isArray(raw)) return []
  return raw
    .filter(
      (m): m is ChatMessage =>
        !!m &&
        typeof m === 'object' &&
        ['user', 'assistant', 'system'].includes((m as ChatMessage).role) &&
        typeof (m as ChatMessage).content === 'string',
    )
    .map((m) => ({ role: m.role, content: String(m.content) }))
}

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const uid = await currentUserId()
  if (!uid) return NextResponse.json({ ok: false, error: 'Authentication required.' }, { status: 401 })
  const { id } = await ctx.params
  const chat = getChatForUser(uid, id)
  if (!chat) return NextResponse.json({ ok: false, error: 'Not found.' }, { status: 404 })
  return NextResponse.json({ ok: true, chat })
}

export async function PUT(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const uid = await currentUserId()
  if (!uid) return NextResponse.json({ ok: false, error: 'Authentication required.' }, { status: 401 })
  const { id } = await ctx.params
  const body = await req.json().catch(() => null)
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ ok: false, error: 'Invalid request body.' }, { status: 400 })
  }
  const created = body.createdAt && typeof body.createdAt === 'string' ? body.createdAt : undefined
  const chat = saveChatForUser(uid, {
    id,
    title: typeof body.title === 'string' ? body.title : undefined,
    messages: validMessages(body.messages),
    createdAt: created,
  })
  return NextResponse.json({ ok: true, chat })
}

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const uid = await currentUserId()
  if (!uid) return NextResponse.json({ ok: false, error: 'Authentication required.' }, { status: 401 })
  const { id } = await ctx.params
  const deleted = deleteChatForUser(uid, id)
  if (!deleted) return NextResponse.json({ ok: false, error: 'Not found.' }, { status: 404 })
  return NextResponse.json({ ok: true })
}