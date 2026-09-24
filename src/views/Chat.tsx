import { useEffect, useRef, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Bot, Globe, MessageSquarePlus, Mic, MicOff, Paperclip, Send, Sparkles, Volume2, VolumeX, ImageIcon, Wrench, Bookmark } from 'lucide-react'
import type { Tab } from '../components/TopBar'
import type { ChatMessage, SearchSource, Settings } from '../types'
import { createChat, getChat, loadSettings, saveChat, saveSettings, sendChat } from '../api'
import { speak, startVoiceInput, stopSpeaking, sttSupported, ttsSupported } from '../lib/speech'
import ModelPicker from '../components/ModelPicker'
import HeroBanner from '../components/HeroBanner'
import { SUGGESTIONS } from '../registry'

interface Props {
  seed: { prompt: string; n: number } | null
  /** Conversation to open on mount (from the sidebar history). */
  initialId?: string | null
  /** Fired after any create/save so the sidebar can refresh its list. */
  onHistoryChanged?: () => void
  onOpenSettings?: () => void
  onAttach?: (file: File) => void
  onOpenSettings?: () => void
  onAttach?: (file: File) => void
  /** Jump to another tab from the welcome quick-nav grid. */
  onGoTab?: (tab: Tab) => void
}

export default function Chat({ seed, initialId, onHistoryChanged, onOpenSettings, onAttach }: Props) {
  // App settings (provider, model, temperature…) persisted to localStorage.
  const [settings, setSettings] = useState<Settings>(() => loadSettings())
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [sourcesMap, setSourcesMap] = useState<Record<number, SearchSource[]>>({})
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [showSystem, setShowSystem] = useState(false)
  const [system, setSystem] = useState('You are a helpful, honest assistant.')
  const [web, setWeb] = useState<'off' | 'on'>('on')
  // Id of the conversation currently being edited (null = brand-new chat).
  const [convId, setConvId] = useState<string | null>(initialId ?? null)
  const [loadingChat, setLoadingChat] = useState(!!initialId)
  // Free in-browser speech: mic input + read-aloud.
  const [listening, setListening] = useState(false)
  const [speakingIdx, setSpeakingIdx] = useState<number | null>(null)
  const recognitionStopRef = useRef<(() => void) | null>(null)
  const micBaseRef = useRef('')
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (seed) setInput(seed.prompt)
  }, [seed])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, busy])

  // Load an existing conversation when the sidebar picks one. App remounts Chat
  // with a fresh key per conversation, so this runs once per opened chat.
  useEffect(() => {
    if (!initialId) return
    let alive = true
    getChat(initialId)
      .then(({ chat }) => {
        if (!alive) return
        setMessages(chat.messages)
        setSourcesMap({})
        setConvId(chat.id)
        setLoadingChat(false)
      })
      .catch(() => {
        if (!alive) return
        // Deleted or unreachable — start a fresh conversation.
        setConvId(null)
        setLoadingChat(false)
      })
    return () => {
      alive = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialId])

  const update = (s: Settings) => {
    setSettings(s)
    saveSettings(s)
  }

  const titleOf = (msgs: ChatMessage[]) => msgs.find((m) => m.role === 'user')?.content ?? 'New chat'

  const persist = async (id: string | null, msgs: ChatMessage[]) => {
    if (!id) return
    try {
      await saveChat(id, { title: titleOf(msgs), messages: msgs })
      onHistoryChanged?.()
    } catch {
      // Persistence is best-effort — never block the conversation.
    }
  }

  const send = async () => {
    const text = input.trim()
    if (!text || busy || loadingChat) return
    // Cancel any in-progress voice input before sending.
    recognitionStopRef.current?.()
    recognitionStopRef.current = null
    setListening(false)
    const userMsg: ChatMessage = { role: 'user', content: text }
    const next = [...messages, userMsg]
    setMessages(next)
    setInput('')
    setBusy(true)

    let id = convId
    // Ensure the conversation exists server-side before the AI call, so the
    // user message survives even if the reply is interrupted.
    if (!id) {
      try {
        const created = await createChat({ title: text, messages: [userMsg] })
        id = created.chat.id
        setConvId(id)
        onHistoryChanged?.()
      } catch {
        id = null
      }
    } else {
      await persist(id, next)
    }

    try {
      const { reply, sources } = await sendChat({
        provider: settings.provider,
        model: settings.model,
        messages: showSystem && system.trim() ? [{ role: 'system', content: system }, ...next] : next,
        web: web === 'on',
        openrouterKey: settings.openrouterKey || undefined,
        geminiKey: settings.geminiKey || undefined,
        xkiroKey: settings.xkiroKey || undefined,
        webSearchKey: settings.webSearchKey || undefined,
        ollamaBaseUrl: settings.ollamaBaseUrl || undefined,
      })
      const final: ChatMessage[] = [...next, { role: 'assistant', content: reply }]
      setMessages(final)
      setSourcesMap((prev) => ({ ...prev, [next.length]: sources ?? [] }))
      await persist(id, final)
    } catch (e) {
      const final: ChatMessage[] = [
        ...next,
        { role: 'assistant', content: `Error: ${e instanceof Error ? e.message : 'Something went wrong.'}` },
      ]
      setMessages(final)
      await persist(id, final)
    } finally {
      setBusy(false)
    }
  }

  const startPrompt = (p: string) => {
    setInput(p)
    inputRef.current?.focus()
  }

  const resetChat = () => {
    setMessages([])
    setSourcesMap({})
    setInput('')
    setConvId(null)
  }

  const toggleMic = () => {
    if (listening) {
      recognitionStopRef.current?.()
      recognitionStopRef.current = null
      setListening(false)
      return
    }
    if (!sttSupported) return
    micBaseRef.current = input
    const stop = startVoiceInput({
      onResult: (finalText, interim) => {
        const base = micBaseRef.current
        const spoken = `${finalText}${interim}`
        setInput(base ? (spoken ? `${base} ${spoken}` : base) : spoken)
      },
      onEnd: () => {
        recognitionStopRef.current = null
        setListening(false)
      },
      onError: () => {
        recognitionStopRef.current = null
        setListening(false)
      },
    })
    if (stop) {
      recognitionStopRef.current = stop
      setListening(true)
    }
  }

  const toggleSpeak = (idx: number, content: string) => {
    if (speakingIdx === idx) {
      stopSpeaking()
      setSpeakingIdx(null)
      return
    }
    setSpeakingIdx(idx)
    speak(content, {
      onEnd: () => setSpeakingIdx((cur) => (cur === idx ? null : cur)),
    })
  }

  const welcome = !loadingChat && messages.length === 0

  const attachRef = useRef<HTMLInputElement>(null)
  const pickFile = (f: File | undefined) => {
    if (!f || !onAttach) return
    onAttach(f)
  }

  const composer = (
    <div className="composer">
      {!welcome && (
        <div className="composer-model-chip">
          <ModelPicker settings={settings} onChange={update} />
        </div>
      )}
      <div className="composer-row">
        <button
          type="button"
          className="composer-icon"
          title={onAttach ? 'Attach an image to analyze' : 'Attach'}
          aria-label="Attach image"
          onClick={() => attachRef.current?.click()}
        >
          <Paperclip size={17} />
        </button>
        <input
          ref={attachRef}
          type="file"
          accept="image/*"
          hidden
          onChange={(e) => {
            pickFile(e.target.files?.[0])
            e.target.value = ''
          }}
        />

        {sttSupported && (
          <button
            type="button"
            className={`composer-icon ${listening ? 'listening' : ''}`}
            title={listening ? 'Stop voice input' : 'Speak to type — free, in your browser'}
            aria-label={listening ? 'Stop voice input' : 'Start voice input'}
            onClick={toggleMic}
          >
            {listening ? <MicOff size={17} /> : <Mic size={17} />}
          </button>
        )}

        <textarea
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              void send()
            }
          }}
          placeholder="Ask anything… (Enter to send, Shift+Enter for a new line)"
          rows={2}
        />

        <div className="cw-search">
          <Globe size={14} />
          <select
            value={web}
            onChange={(e) => setWeb(e.target.value as 'off' | 'on')}
            aria-label="Web search"
            title="Web search"
          >
            <option value="off">Web search: Off</option>
            <option value="on">Web search: On</option>
          </select>
        </div>

        <button className="primary composer-send" onClick={() => void send()} disabled={busy || !input.trim()}>
          <Send size={16} />
          <span>Send</span>
        </button>
      </div>
      {web === 'on' && (
        <p className="hint composer-note">
          {settings.webSearchKey ? (
            <>Web search is on — fresh results are included with your message and cited in the reply.</>
          ) : (
            <>
              Web search needs a free Tavily API key — add one in <em>Settings</em>, or switch{' '}
              <em>Web search: Off</em>.
            </>
          )}
        </p>
      )}
    </div>
  )

  return (
    <div className={`page chat-page ${welcome ? 'welcome' : ''}`}>
      {welcome ? (
        <>
          <HeroBanner />

          <ModelPicker big settings={settings} onChange={update} onOpenSettings={onOpenSettings} />

          <div className="chat-welcome">
            <div className="cw-icon">
              <Sparkles size={26} />
            </div>
            <h2>How can I help you today?</h2>
            <p>Ask a question, generate images, write code, or use any tool from the sidebar.</p>
            <div className="cw-suggestions">
              {SUGGESTIONS.map((s) => (
                <button key={s.label} className="cw-suggestion" onClick={() => startPrompt(s.prompt)}>
                  <span className="cs-label">{s.label}</span>
                  <span className="cs-prompt">{s.prompt}</span>
                </button>
              ))}
            </div>
          </div>

          {composer}
        </>
      ) : (
        <>
          <div className="chat-top">
            <div className="chat-actions">
              <button className="ghost" onClick={() => setShowSystem((v) => !v)}>
                <Bot size={16} />
                <span>{showSystem ? 'Hide system prompt' : 'System prompt'}</span>
              </button>
              <button className="ghost" onClick={resetChat}>
                <MessageSquarePlus size={16} />
                <span>New chat</span>
              </button>
            </div>
          </div>

          {showSystem && (
            <textarea
              className="system-input"
              value={system}
              onChange={(e) => setSystem(e.target.value)}
              placeholder="Optional system prompt — sets the assistant's behavior"
              rows={2}
            />
          )}

          <div className="messages">
            {messages.map((m, i) => (
              <div key={i} className={`msg ${m.role}`}>
                <div className="bubble">
                  {m.role === 'assistant' ? (
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{m.content}</ReactMarkdown>
                  ) : (
                    <pre>{m.content}</pre>
                  )}
                </div>
                {m.role === 'assistant' && ttsSupported && (
                  <button
                    className={`msg-speak ${speakingIdx === i ? 'speaking' : ''}`}
                    title={speakingIdx === i ? 'Stop reading' : 'Read aloud — free, in your browser'}
                    aria-label={speakingIdx === i ? 'Stop reading aloud' : 'Read this message aloud'}
                    onClick={() => toggleSpeak(i, m.content)}
                  >
                    {speakingIdx === i ? <VolumeX size={15} /> : <Volume2 size={15} />}
                  </button>
                )}
                {m.role === 'assistant' && (sourcesMap[i]?.length ?? 0) > 0 && (
                  <div className="msg-sources">
                    <span className="msg-sources-label">Sources</span>
                    <ul>
                      {sourcesMap[i].map((s, j) => (
                        <li key={j}>
                          <a href={s.url} target="_blank" rel="noreferrer">
                            {s.title}
                          </a>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ))}
            {(busy || loadingChat) && (
              <div className="msg assistant">
                <div className="bubble typing">
                  <span />
                  <span />
                  <span />
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {composer}
        </>
      )}
    </div>
  )
}