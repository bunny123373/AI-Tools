'use client'

import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import type { FormEvent } from 'react'
import { ArrowRight, Boxes, Eye, EyeOff, KeyRound, Loader2, LogIn, Mail, Plus, User } from 'lucide-react'
import type { LoginProviderId } from '@/auth'

interface Props {
  providers: LoginProviderId[]
  callbackUrl: string
}

type Mode = 'signin' | 'register'

export default function LoginForm({ providers, callbackUrl }: Props) {
  const router = useRouter()
  const [mode, setMode] = useState<Mode>('signin')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState<string | null>(null)

  const hasOauth = providers.some((p) => p === 'google' || p === 'github')

  const go = (path: string) => {
    router.push(path)
    router.refresh()
  }

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')

    if (mode === 'register') {
      setBusy('register')
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password }),
      }).catch(() => null)
      const data = (await res?.json().catch(() => null)) ?? null
      setBusy(null)
      if (!res?.ok || !data?.ok) {
        setError(String(data?.error ?? 'Registration failed. Please try again.'))
        return
      }
    }

    setBusy('email')
    const res = await signIn('credentials', { redirect: false, email, password })
    setBusy(null)
    if (!res || res.error) {
      setError(res?.error === 'CredentialsSignin' ? 'Invalid email or password.' : String(res?.error ?? 'Sign-in failed. Please try again.'))
      return
    }
    go(callbackUrl || '/')
  }

  const oauth = async (provider: 'google' | 'github') => {
    setError('')
    setBusy(provider)
    // Full-page redirect to the provider; no return value needed.
    await signIn(provider, { callbackUrl: callbackUrl || '/' })
    setBusy(null)
  }

  return (
    <main className="login-shell">
      <div className="login-halo" aria-hidden="true" />
      <div className="login-card">
        <div className="login-brand">
          <span className="login-logo">
            <Boxes size={20} />
          </span>
          <h1 className="login-title">AI Toolbox</h1>
          <p className="login-sub">Sign in to unlock all free AI tools.</p>
        </div>

        <div className="login-tabs" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'signin'}
            className={`login-tab ${mode === 'signin' ? 'active' : ''}`}
            onClick={() => {
              setMode('signin')
              setError('')
            }}
          >
            <LogIn size={14} />
            Sign in
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'register'}
            className={`login-tab ${mode === 'register' ? 'active' : ''}`}
            onClick={() => {
              setMode('register')
              setError('')
            }}
          >
            <Plus size={14} />
            Create account
          </button>
        </div>

        <form className="login-form" onSubmit={submit} noValidate>
          {mode === 'register' && (
            <label className="login-field">
              <span>Name</span>
              <div className="login-input-wrap">
                <User size={15} className="login-input-icon" />
                <input
                  className="login-input"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your name"
                  autoComplete="name"
                />
              </div>
            </label>
          )}

          <label className="login-field">
            <span>Email</span>
            <div className="login-input-wrap">
              <Mail size={15} className="login-input-icon" />
              <input
                className="login-input"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                autoComplete="email"
                required
              />
            </div>
          </label>

          <label className="login-field">
            <span>Password</span>
            <div className="login-input-wrap">
              <KeyRound size={15} className="login-input-icon" />
              <input
                className="login-input"
                type={showPw ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={mode === 'register' ? 'At least 6 characters' : '••••••••'}
                autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
                required
              />
              <button
                type="button"
                className="login-eye"
                onClick={() => setShowPw((v) => !v)}
                aria-label={showPw ? 'Hide password' : 'Show password'}
              >
                {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </label>

          {error && <div className="login-error">{error}</div>}

          <button type="submit" className="login-btn primary" disabled={busy !== null}>
            {busy === 'email' || busy === 'register' ? <Loader2 size={15} className="spin" /> : <ArrowRight size={15} />}
            {mode === 'register' ? 'Create account' : 'Sign in'}
          </button>
        </form>

        {hasOauth && (
          <>
            <div className="login-divider">
              <span>or</span>
            </div>

            <div className="login-alt">
              {providers.includes('google') && (
                <button type="button" className="login-btn oauth" onClick={() => oauth('google')} disabled={busy !== null}>
                  {busy === 'google' ? <Loader2 size={15} className="spin" /> : <span className="oauth-g">G</span>}
                  Continue with Google
                </button>
              )}
              {providers.includes('github') && (
                <button type="button" className="login-btn oauth" onClick={() => oauth('github')} disabled={busy !== null}>
                  {busy === 'github' ? <Loader2 size={15} className="spin" /> : <span className="oauth-gh">⌥</span>}
                  Continue with GitHub
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </main>
  )
}