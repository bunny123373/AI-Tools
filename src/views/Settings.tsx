import { useEffect, useState } from 'react'
import { Check, Coins, Globe, Info, Search, ShieldCheck, Sparkles } from 'lucide-react'
import type { ProviderInfo, Settings } from '../types'
import { fetchProviders, loadSettings, saveSettings } from '../api'

export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings>(() => loadSettings())
  const [providers, setProviders] = useState<ProviderInfo[]>([])
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    fetchProviders().then(setProviders).catch(() => setProviders([]))
  }, [])

  const update = (s: Settings) => {
    setSettings(s)
    saveSettings(s)
    setSaved(true)
    setTimeout(() => setSaved(false), 1500)
  }

  return (
    <div className="page settings-page">
      <div className="section-head">
        <h1>Settings</h1>
        <p>Everything is saved only in your browser (localStorage) — nothing is sent anywhere except your chosen AI provider.</p>
        {saved && (
          <span className="saved-badge">
            <Check size={14} /> Saved
          </span>
        )}
      </div>

      <div className="settings-grid">
        <div className="card">
          <h2><Coins size={18} /> OpenRouter — free models</h2>
          <p className="hint">Free key at <a href="https://openrouter.ai/keys" target="_blank" rel="noreferrer">openrouter.ai/keys</a>. Models ending in <code>:free</code> cost $0.</p>
          <label>
            <span>OpenRouter API key</span>
            <input
              type="password"
              value={settings.openrouterKey}
              onChange={(e) => update({ ...settings, openrouterKey: e.target.value })}
              placeholder="sk-or-…"
              autoComplete="off"
            />
          </label>
        </div>

        <div className="card">
          <h2><Globe size={18} /> Google Gemini — free tier</h2>
          <p className="hint">Free key at <a href="https://aistudio.google.com/apikey" target="_blank" rel="noreferrer">aistudio.google.com/apikey</a>. The free tier is generous for personal use.</p>
          <label>
            <span>Gemini API key</span>
            <input
              type="password"
              value={settings.geminiKey}
              onChange={(e) => update({ ...settings, geminiKey: e.target.value })}
              placeholder="AIza…"
              autoComplete="off"
            />
          </label>
        </div>

        <div className="card">
          <h2><Coins size={18} /> xkiro — free models</h2>
          <p className="hint">OpenAI-compatible gateway — models ending in <code>:free</code> cost $0. Base <code>https://api.xkiro.com/v1</code>.</p>
          <label>
            <span>xkiro API key</span>
            <input
              type="password"
              value={settings.xkiroKey}
              onChange={(e) => update({ ...settings, xkiroKey: e.target.value })}
              placeholder="sk-xt-…"
              autoComplete="off"
            />
          </label>
        </div>

        <div className="card">
          <h2><Sparkles size={18} /> OpenCode — free allowance</h2>
          <p className="hint">Free <code>oc_sk_…</code> key at <a href="https://opencode.ai" target="_blank" rel="noreferrer">opencode.ai</a>. Uses <code>space-bunny-free</code> — other Zen free models are restricted to the OpenCode app itself.</p>
          <label>
            <span>OpenCode API key</span>
            <input
              type="password"
              value={settings.opencodeKey}
              onChange={(e) => update({ ...settings, opencodeKey: e.target.value })}
              placeholder="oc_sk_…"
              autoComplete="off"
            />
          </label>
        </div>

        <div className="card">
          <h2><Search size={18} /> Web search — Tavily</h2>
          <p className="hint">Free key at <a href="https://app.tavily.com" target="_blank" rel="noreferrer">tavily.com</a> (~1,000 credits/month). Powers the chat composer&apos;s <em>Web search: On</em> — replies cite the sources they used.</p>
          <label>
            <span>Tavily API key</span>
            <input
              type="password"
              value={settings.webSearchKey}
              onChange={(e) => update({ ...settings, webSearchKey: e.target.value })}
              placeholder="tvly-…"
              autoComplete="off"
            />
          </label>
        </div>
      </div>

      {providers.length > 0 && (
        <div className="card">
          <h2><Info size={18} /> Providers available on this server</h2>
          <ul className="provider-list">
            {providers.map((p) => (
              <li key={p.id}>
                <strong>{p.name}</strong> — {p.free}
                {p.keyHint && <span className="hint"> {p.keyHint}</span>}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="card">
        <h2><ShieldCheck size={18} /> Data & privacy</h2>
        <p className="hint">
          Your API keys and prompts stay in <code>localStorage</code> on this machine and are only sent to the API provider you chose (via the local server, which never logs them). No accounts, no tracking, no cost required to get started.
        </p>
      </div>
    </div>
  )
}