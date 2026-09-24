import { NextResponse } from 'next/server'
import { createUser } from '@/lib/users'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export async function POST(req: Request) {
  const body = await req.json().catch(() => null)
  const name = String(body?.name ?? '').trim().slice(0, 80)
  const email = String(body?.email ?? '').trim().toLowerCase()
  const password = String(body?.password ?? '')

  if (!EMAIL_RE.test(email)) {
    return NextResponse.json({ ok: false, error: 'Please enter a valid email address.' }, { status: 400 })
  }
  if (password.length < 6) {
    return NextResponse.json({ ok: false, error: 'Password must be at least 6 characters.' }, { status: 400 })
  }

  try {
    const user = createUser({ name, email, password })
    return NextResponse.json({ ok: true, user: { id: user.id, name: user.name, email: user.email } })
  } catch (e) {
    if (e instanceof Error && e.message === 'EMAIL_TAKEN') {
      return NextResponse.json({ ok: false, error: 'An account with this email already exists.' }, { status: 409 })
    }
    return NextResponse.json({ ok: false, error: 'Registration failed. Please try again.' }, { status: 500 })
  }
}