import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import Chat from './views/Chat'
import Tools from './views/Tools'
import Images from './views/Images'
import Prompts from './views/Prompts'
import SettingsPage from './views/Settings'
import UiPicker from './views/UiPicker'
import FloatingTools, { type FloatingTarget } from './components/FloatingTools'
import TopBar, { type Tab } from './components/TopBar'
import LeftSidebar from './components/LeftSidebar'
import RightSidebar from './components/RightSidebar'
import MobileNav from './components/MobileNav'
import QuickTools from './components/QuickTools'
import { History, X } from 'lucide-react'

function initialTab(): Tab {
  const t = new URLSearchParams(window.location.search).get('tab')
  return (['chat', 'tools', 'images', 'prompts', 'ui', 'settings'] as Tab[]).includes(t as Tab)
    ? (t as Tab)
    : 'chat'
}

function focusSearch(): void {
  ;(window as unknown as { __focusToolSearch?: () => void }).__focusToolSearch?.()
}

export default function App() {
  const [tab, setTab] = useState<Tab>(initialTab)
  const [seed, setSeed] = useState<{ prompt: string; n: number } | null>(null)
  // Deep-link target from the floating tools bar / search; ts forces a remount.
  const [target, setTarget] = useState<(FloatingTarget & { ts: number }) | null>(null)
  // Remount chat to start a brand-new conversation.
  const [chatReset, setChatReset] = useState(0)
  // Chat history: the conversation open in the chat view, and a version counter
  // bumped whenever history changes so the sidebar refetches its list.
  const [activeChatId, setActiveChatId] = useState<string | null>(null)
  const [historyVersion, setHistoryVersion] = useState(0)
  // Programmatic open signal for the floating "all tools" panel.
  const [fabSignal, setFabSignal] = useState(0)
  // Image handed over from chat's attach button → Images → Analyze.
  const [imagePending, setImagePending] = useState<{ file: File; ts: number } | null>(null)
  // Mobile & tablet full-screen chat: slide-in chat-history drawer (opened by the left edge bar).
  const [historyOpen, setHistoryOpen] = useState(false)
  // The drawer is a mobile/tablet feature. Real hardware lies about `pointer`/
  // `hover` in every direction, so detect the opposite of what we need: keep
  // the slider bar hidden ONLY when the device is unambiguously a desktop —
  // hover-capable pointer, fine pointer, and zero touch hardware — or when the
  // viewport is >1100px. Everything else (real phones, tablets, touch screens,
  // quirky browsers) gets the drawer.
  const [touchbar, setTouchbar] = useState(false)
  useEffect(() => {
    if (typeof window === 'undefined') return
    const mqHoverHover = window.matchMedia('(hover: hover)')
    const mqFine = window.matchMedia('(pointer: fine)')
    const update = () => {
      const noTouchHardware = navigator.maxTouchPoints === 0 && !('ontouchstart' in window)
      const desktopLike = mqHoverHover.matches && mqFine.matches && noTouchHardware
      setTouchbar(window.innerWidth <= 1100 && !desktopLike)
    }
    update()
    mqHoverHover.addEventListener?.('change', update)
    mqFine.addEventListener?.('change', update)
    window.addEventListener('resize', update)
    return () => {
      mqHoverHover.removeEventListener?.('change', update)
      mqFine.removeEventListener?.('change', update)
      window.removeEventListener('resize', update)
    }
  }, [])

  // Guest mode: the chat page + history work signed out; the other tabs
  // (tools / images / prompts / settings) show a sign-in prompt instead.
  const { status: sessionStatus } = useSession()
  const signedOut = sessionStatus === 'unauthenticated'

  const usePrompt = (prompt: string) => {
    setTarget(null)
    setSeed({ prompt, n: Date.now() })
    setTab('chat')
  }

  const goTab = (t: Tab) => {
    setTarget(null)
    setTab(t)
  }

  const openTool = (t: FloatingTarget) => {
    setTarget({ ...t, ts: Date.now() })
    setTab(t.tab)
  }

  const newChat = () => {
    setTarget(null)
    setSeed(null)
    setActiveChatId(null)
    setChatReset(Date.now())
    setTab('chat')
  }

  const openChat = (id: string) => {
    setTarget(null)
    setSeed(null)
    setActiveChatId(id)
    setChatReset(Date.now())
    setTab('chat')
  }

  const handleHistoryChanged = () => setHistoryVersion((v) => v + 1)

  const handleDeleteChat = (id: string) => {
    setHistoryVersion((v) => v + 1)
    if (id === activeChatId) newChat()
  }

  const moreTools = () => setFabSignal(Date.now())

  const attachImage = (file: File) => {
    const ts = Date.now()
    setImagePending({ file, ts })
    setTarget({ tab: 'images', imageMode: 'analyze', ts })
    setTab('images')
  }

  const imagesKey = imagePending ? `images-${imagePending.ts}` : target?.tab === 'images' ? `images-${target.ts}` : 'images'

  return (
    <div className={`app ${tab === 'chat' ? 'app-chat-mode' : ''}`}>
      <TopBar active={tab} onNav={goTab} onPick={openTool} />

      <div className="shell">
        <LeftSidebar
          active={tab}
          onNav={goTab}
          onNewChat={newChat}
          onSeed={usePrompt}
          activeChatId={activeChatId}
          onOpenChat={openChat}
          onDeleteChat={handleDeleteChat}
          historyKey={historyVersion}
        />

        <main className="main">
          <div className="content">
            {tab === 'chat' && (
              <Chat
                key={`chat-${chatReset}-${activeChatId ?? 'new'}`}
                seed={seed}
                initialId={activeChatId}
                onHistoryChanged={handleHistoryChanged}
                onOpenSettings={() => goTab('settings')}
                onAttach={attachImage}
                onGoTab={goTab}
              />
            )}
            {signedOut ? (
              <div className="guest-gate">
                <h2>Sign in to use this tool</h2>
                <p>
                  Chatting and saving your history work without an account. Tools, Images, Prompts and Settings need a
                  free sign-in.
                </p>
                <a className="primary guest-gate-cta" href="/login">
                  Sign in
                </a>
              </div>
            ) : (
              <>
                {tab === 'tools' && (
                  <Tools
                    key={target && target.tab === 'tools' ? `tools-${target.ts}` : 'tools'}
                    initialKind={target?.tab === 'tools' ? target.tool : undefined}
                    initialPdfMode={target?.tab === 'tools' ? target.pdf : undefined}
                  />
                )}
                {tab === 'images' && (
                  <Images
                    key={imagesKey}
                    initialMode={target?.tab === 'images' ? target.imageMode : undefined}
                    initialFile={imagePending?.file ?? null}
                  />
                )}
                {tab === 'prompts' && <Prompts onUse={usePrompt} />}
                {tab === 'ui' && <UiPicker />}
                {tab === 'settings' && <SettingsPage />}
              </>
            )}

            <div className="qt-inline">
              <div className="sb-label">Quick tools</div>
              <QuickTools
                onNavigate={openTool}
                onSeed={usePrompt}
                onMore={moreTools}
                onFocusSearch={focusSearch}
              />
            </div>
          </div>

          <footer className="footer">
            <div className="footer-inner">
              <span className="footer-tagline">
                AI Toolbox • Built with <span className="footer-heart">❤️</span> • 100% Free • Local + Open Models •
                No Paid Plans
              </span>
              <div className="footer-links">
                <a href="#privacy">Privacy</a>
                <a href="#terms">Terms</a>
                <a href="https://github.com" target="_blank" rel="noreferrer">
                  GitHub
                </a>
              </div>
            </div>
          </footer>
        </main>

        <RightSidebar
          onNavigate={openTool}
          onSeed={usePrompt}
          onMore={moreTools}
          onFocusSearch={focusSearch}
          onNav={goTab}
        />
      </div>

      {touchbar && (
        <>
          <button
            type="button"
            className={`history-handle ${historyOpen ? 'open' : ''}`}
            onClick={() => setHistoryOpen((v) => !v)}
            aria-label={historyOpen ? 'Close chat history' : 'Open chat history'}
            aria-expanded={historyOpen}
            title="Chat history"
          >
            <History size={17} />
          </button>

          <div className={`history-drawer ${historyOpen ? 'open' : ''}`}>
            <div className="history-drawer-backdrop" onClick={() => setHistoryOpen(false)} />
            <aside className="history-drawer-panel">
              <div className="history-drawer-head">
                <span className="history-drawer-title">
                  <History size={15} />
                  Chat history
                </span>
                <button
                  type="button"
                  className="history-drawer-close"
                  onClick={() => setHistoryOpen(false)}
                  aria-label="Close chat history"
                >
                  <X size={15} />
                </button>
              </div>
              <LeftSidebar
                active={tab}
                onNav={(t) => {
                  setHistoryOpen(false)
                  goTab(t)
                }}
                onNewChat={() => {
                  setHistoryOpen(false)
                  newChat()
                }}
                onSeed={(p) => {
                  setHistoryOpen(false)
                  usePrompt(p)
                }}
                activeChatId={activeChatId}
                onOpenChat={(id) => {
                  setHistoryOpen(false)
                  openChat(id)
                }}
                onDeleteChat={handleDeleteChat}
                historyKey={historyVersion}
              />
            </aside>
          </div>
        </>
      )}

      {tab !== 'chat' && <MobileNav active={tab} onNav={goTab} />}

      <FloatingTools currentTab={tab} onNavigate={openTool} openSignal={fabSignal} />
    </div>
  )
}