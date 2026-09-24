// Chat history API — list & create conversations for the current user.
// Guest mode: signed-out visitors get a per-browser guest id (proxy sets the
// guest_id cookie) so they can save chats without creating an account.
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { auth } from '@/auth'
import { createChatForUser, listChatsForUser, sanitizeMessages } from '@/lib/history'

export const dynamic = 'force-dynamic'

async function currentUserId(): Promise<string | null> {
  const session = await auth()
  if (session?.user?.id) return session.user.id as string
  const store = await cookies()
  const gid = store.get('guest_id')?.value
  return gid ? `guest_${gid}` : null
}

export async function GET() {
  const uid = await currentUserId()
  if (!uid) return NextResponse.json({ ok: false, error: 'Authentication required.' }, { status: 401 })
  return NextResponse.json({ ok: true, chats: listChatsForUser(uid) })
}

export async function POST(req: Request) {
  const uid = await currentUserId()
  if (!uid) return NextResponse.json({ ok: false, error: 'Authentication required.' }, { status: 401 })
  const body = await req.json().catch(() => null)
  const title = body && typeof body.title === 'string' ? body.title : undefined
  const chat = createChatForUser(uid, { title, messages: sanitizeMessages(body?.messages) })
  return NextResponse.json({ ok: true, chat }, { status: 201 })
}