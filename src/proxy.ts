// Next.js 16 Proxy (formerly middleware): auth gate at the network boundary.
// Guest mode: the chat page, /api/chat, and /api/history* work signed out
// (history is scoped per-browser via a guest_id cookie). Everything else —
// tools, images, video, prompts, settings and their APIs — stays gated.
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getToken } from 'next-auth/jwt'

// Auth.js v5 JWT session cookie names (secure variant on https).
const sessionCookieName = (req: NextRequest): string =>
  req.nextUrl.protocol === 'https:' ? '__Secure-authjs.session-token' : 'authjs.session-token'

// Guest-allowed paths: plain chatting (+ model/provider/health meta) and
// history save/list. The chat SPA lives at "/".
// In-chat image features (analyze via user's own keys in the body, generate via
// free Pollinations / user keys) are part of the guest-accessible chat page.
const GUEST_API_PREFIXES = [
  '/api/chat',
  '/api/models',
  '/api/providers',
  '/api/health',
  '/api/history',
  '/api/tools/image/analyze',
  '/api/tools/image/generate',
]

function isGuestAllowed(request: NextRequest): boolean {
  const { pathname } = request.nextUrl
  if (pathname === '/') return true
  return GUEST_API_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`))
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Auth.js owns /api/auth/* — never intercept (csrf, callbacks, session…).
  if (pathname.startsWith('/api/auth')) return NextResponse.next()

  // The login page must always be reachable.
  if (pathname === '/login') return NextResponse.next()

  const token = await getToken({
    req: request,
    secret: process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET,
    cookieName: sessionCookieName(request),
  })

  // Signed in → everything is allowed.
  if (token) return NextResponse.next()

  // Signed out → guest mode: seed a per-browser guest id so guest history
  // stays scoped to this browser, then allow the guest paths through.
  const guestResponse = isGuestAllowed(request) ? NextResponse.next() : null
  if (guestResponse) {
    if (!request.cookies.get('guest_id')?.value) {
      guestResponse.cookies.set('guest_id', crypto.randomUUID(), {
        path: '/',
        httpOnly: true,
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 365, // 1 year
        secure: request.nextUrl.protocol === 'https:',
      })
    }
    return guestResponse
  }

  // Signed-out API access → 401 JSON (tools/images/video stay protected).
  if (pathname.startsWith('/api/')) {
    return NextResponse.json({ ok: false, error: 'Authentication required.' }, { status: 401 })
  }

  // Signed-out page access → redirect to login, remembering where to return.
  const url = request.nextUrl.clone()
  url.pathname = '/login'
  url.search = ''
  url.searchParams.set('callbackUrl', pathname)
  return NextResponse.redirect(url)
}

export const config = {
  // Protect everything except: Next internals, static assets, metadata files,
  // images/fonts, and the auth/asset paths handled above. `/api/*` is included
  // on purpose so non-guest API routes get the 401 gate too.
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|tools.png|robots.txt|sitemap.xml|.*\\.(?:png|jpg|jpeg|gif|svg|webp|ico|css|js|mjs|woff2?|ttf|otf|mp4|webm|pdf|json)).*)',
  ],
}